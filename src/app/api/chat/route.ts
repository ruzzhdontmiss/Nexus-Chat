import { NextRequest } from "next/server";
import { AIOrchestrator } from "@/lib/ai/orchestrator";
import { ModelRequest, ProviderError } from "@/lib/ai/types";
import { createMessage } from "@/lib/db/messages";
import { updateConversationTitle, createConversation } from "@/lib/db/conversations";
import { requireUser } from "@/lib/auth";
import { checkFreeUsage, recordFreeUsage, RateLimitError } from "@/lib/usage/limits";
import { modelRegistry } from "@/lib/ai/registry";

export async function POST(req: NextRequest) {
  const reqStart = performance.now();
  console.log(`[Performance] Request started`);
  try {
    const { messages, modelId, conversationId } = await req.json();
    
    const user = await requireUser();

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new ProviderError("invalid_request", "Messages array is required and must not be empty.");
    }
    
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const conv = await createConversation(user.id);
      currentConversationId = conv.id;
    }

    const userMessage = messages[messages.length - 1];
    
    // 1. Persist User Message
    await createMessage(user.id, currentConversationId, userMessage.role, userMessage.content);

    // 2. Generate title if it's the first message (messages length === 1)
    if (messages.length === 1 && userMessage.content) {
      // Derive a deterministic title without calling an LLM
      let title = userMessage.content.trim().split('\n')[0]; // Take first line
      if (title.length > 40) {
        title = title.substring(0, 40) + "...";
      }
      await updateConversationTitle(user.id, currentConversationId, title);
    }
    
    const request: ModelRequest = {
      modelId: modelId || "nexus/mock-fast",
      messages,
      abortSignal: req.signal, // Propagate cancellation to orchestrator
    };

    const modelInfo = modelRegistry.get(request.modelId);
    if (modelInfo?.tier === "free") {
      await checkFreeUsage(user.id);
    }

    const stream = new ReadableStream({
      async start(controller) {
        let status: "success" | "error" | "rate_limited" = "success";
        let fullResponse = "";
        let isFirstChunk = true;
        try {
          const generator = AIOrchestrator.generate(request);


          for await (const chunk of generator) {
            if (isFirstChunk) {
              console.log(`[Performance] First chunk emitted in ${(performance.now() - reqStart).toFixed(2)}ms`);
              isFirstChunk = false;
            }
            if (req.signal.aborted) break;
            fullResponse += chunk.text;
            controller.enqueue(new TextEncoder().encode(chunk.text));
          }
          
          console.log(`[Performance] Stream completed in ${(performance.now() - reqStart).toFixed(2)}ms`);

          // 3. Persist Assistant Message
          if (fullResponse) {
            await createMessage(user.id, currentConversationId, "assistant", fullResponse);
          }
        } catch (err) {
          if (err instanceof RateLimitError) {
            status = "rate_limited";
          } else {
            status = "error";
          }
          if (err instanceof ProviderError) {
            console.error(`[AI Provider Error] ${err.type}: ${err.message}`);
          } else {
            console.error("[AI Unknown Error]", err);
          }
          // Note: In a real app we might stream a specific error event down
        } finally {
          controller.close();
          // Only record usage for free-tier managed models
          if (modelInfo?.tier === "free") {
            const inputChars = messages.reduce((acc: number, m: any) => acc + (m.content?.length || 0), 0);
            const outputChars = fullResponse.length;
            const inputTokens = Math.ceil(inputChars / 4);
            const outputTokens = Math.ceil(outputChars / 4);
            await recordFreeUsage({
              userId: user.id,
              providerId: modelInfo.provider,
              modelId: modelInfo.id,
              accessType: modelInfo.access || "managed",
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              status
            }).catch((err) => console.error("[Usage] Failed to record usage event:", err));
          }
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: error.message, type: "rate_limit" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (error instanceof ProviderError) {
      return new Response(JSON.stringify({ error: error.message, type: error.type }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
