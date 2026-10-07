import { NextRequest } from "next/server";
import { AIOrchestrator } from "@/lib/ai/orchestrator";
import { ModelRequest, ProviderError } from "@/lib/ai/types";
import { createMessage } from "@/lib/db/messages";
import { updateConversationTitle, createConversation } from "@/lib/db/conversations";
import { requireUser } from "@/lib/auth";
import { resolveModel } from "@/lib/ai/model-resolver";
import { SearchTool } from "@/lib/tools/search/search-tool";
import { buildGroundingContext, extractSources } from "@/lib/tools/search/grounding";
import { getUserEntitlements } from "@/lib/entitlements";
import type { SearchResponse, SourceReference } from "@/lib/tools/types";
import { RateLimitError } from "@/lib/usage/limits";
import { checkRateLimit, checkUsageLimit, recordChatUsage, recordSearchUsage, UsageStatus } from "@/lib/usage/service";
// RAG modules are lazy-loaded when needed
import type { SourceCitation } from "@nexus/rag-contracts";

const searchTool = new SearchTool();

export async function POST(req: NextRequest) {
  const reqStart = performance.now();
  const requestId = crypto.randomUUID();
  console.log(`[Performance] Request ${requestId} started`);
  try {
    const { messages, modelId, conversationId, search, documentIds } = await req.json();
    const user = await requireUser();

    // 1. Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new ProviderError("invalid_request", "Messages array is required and must not be empty.");
    }
    const searchRequested = search === true;

    // 2. Resolve/Create Conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const conv = await createConversation(user.id);
      currentConversationId = conv.id;
    }
    const userMessage = messages[messages.length - 1];

    // 3. Persist User Message
    await createMessage(user.id, currentConversationId, userMessage.role, userMessage.content);
    if (messages.length === 1 && userMessage.content) {
      let title = userMessage.content.trim().split('\n')[0];
      if (title.length > 40) title = title.substring(0, 40) + "...";
      await updateConversationTitle(user.id, currentConversationId, title);
    }

    // 4. Rate Limiting for Chat
    await checkRateLimit(user.id, "chat");

    // 5. Search Execution (if requested)
    let searchResponse: SearchResponse | null = null;
    let sources: SourceReference[] = [];

    if (searchRequested) {
      // Entitlement
      const entitlements = await getUserEntitlements(user.id);
      if (!entitlements.searchEnabled) {
        throw new ProviderError("invalid_request", "Web search is not available for your account.");
      }

      // Quota + Rate Limit
      await checkRateLimit(user.id, "search");
      const searchQuota = await checkUsageLimit(user.id, "search");
      if (!searchQuota.allowed) {
        throw new RateLimitError(searchQuota.reason || "Search limit reached");
      }

      console.log(`[Search] Executing for query: "${userMessage.content.slice(0, 80)}"`);
      const searchStart = performance.now();
      
      const searchResult = await searchTool.execute(
        { query: userMessage.content, maxResults: 5 },
        { userId: user.id, conversationId: currentConversationId, abortSignal: req.signal }
      );

      const searchDuration = performance.now() - searchStart;

      if (req.signal.aborted) {
        // Record cancelled search
        await recordSearchUsage({
          userId: user.id,
          requestId,
          conversationId: currentConversationId,
          durationMs: Math.round(searchDuration),
          status: "cancelled",
        });
        return new Response(JSON.stringify({ error: "Request cancelled." }), {
          status: 499,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!searchResult.success) {
        await recordSearchUsage({
          userId: user.id,
          requestId,
          conversationId: currentConversationId,
          durationMs: Math.round(searchDuration),
          status: "error",
        });
        console.error(`[Search] Failed: ${searchResult.errorType} — ${searchResult.error}`);
        throw new ProviderError("invalid_request", searchResult.error || "Web search failed.");
      }

      searchResponse = searchResult.data as SearchResponse;
      sources = extractSources(searchResponse);
      
      await recordSearchUsage({
        userId: user.id,
        requestId,
        conversationId: currentConversationId,
        durationMs: Math.round(searchDuration),
        status: "success",
      });

      console.log(`[Search] Got ${searchResponse.results.length} results in ${searchDuration.toFixed(0)}ms`);
    }

    // 6. Resolve Model & Check Chat Quota
    const resolvedModelId = modelId || "nexus/mock-fast";
    const resolved = await resolveModel(user.id, resolvedModelId);

    const chatQuota = await checkUsageLimit(user.id, "chat", resolved.source);
    if (!chatQuota.allowed) {
      throw new RateLimitError(chatQuota.reason || "Usage limit reached");
    }

    // 6b. Execute Document Retrieval (if requested)
    let ragCitations: SourceCitation[] = [];
    let ragContextText = "";
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      console.log(`[RAG] Executing retrieval for documents: ${documentIds.join(", ")}`);
      const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";
      const RAG_SERVICE_API_KEY = process.env.RAG_SERVICE_API_KEY || "development-secret-do-not-use-in-prod";

      const res = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RAG_SERVICE_API_KEY}`
        },
        body: JSON.stringify({
          query: userMessage.content,
          filter: {
            userId: user.id,
            documentIds: documentIds
          }
        })
      });

      if (!res.ok) {
        console.error(`[RAG Service Error] ${res.status} ${res.statusText}`);
        throw new ProviderError("invalid_request", "RAG service unavailable");
      }

      const ragContext = await res.json();
      ragCitations = ragContext.citations;
      if (ragContext.results.length > 0) {
        ragContextText = "Retrieved Document Evidence:\n" + ragContext.results.map((r: any) => `Document: ${r.chunk.metadata?.filename || 'Unknown'}\n${r.chunk.content}`).join("\n\n");
      }
    }

    // 7. Build Model Request
    let modelMessages = messages;
    let systemContext = "";

    if (searchResponse) {
      systemContext += buildGroundingContext(searchResponse) + "\n\n";
    }
    if (ragContextText) {
      systemContext += "Use the following retrieved document evidence to answer the user's question accurately. Do not fabricate document facts. Cite your sources.\n\n" + ragContextText;
    }

    if (systemContext) {
      modelMessages = [
        { role: "system", content: systemContext.trim() },
        ...messages,
      ];
    }

    // Merge citations
    const allCitations = [...sources, ...ragCitations];

    const request: ModelRequest = {
      modelId: resolvedModelId,
      messages: modelMessages,
      abortSignal: req.signal,
      credentialKey: resolved.credentialKey,
    };

    // 8. Streaming Response
    const stream = new ReadableStream({
      async start(controller) {
        let status: UsageStatus = "success";
        let fullResponse = "";
        let isFirstChunk = true;
        let providerTokens = { inputTokens: null, outputTokens: null, totalTokens: null };

        try {
          if (allCitations.length > 0) {
            const metaLine = JSON.stringify({ type: "sources", sources: allCitations }) + "\n";
            controller.enqueue(new TextEncoder().encode(metaLine));
          }

          const generator = AIOrchestrator.generate(request);

          for await (const chunk of generator) {
            if (isFirstChunk) {
              console.log(`[Performance] First chunk emitted in ${(performance.now() - reqStart).toFixed(2)}ms`);
              isFirstChunk = false;
            }
            if (req.signal.aborted) break;
            
            fullResponse += chunk.text;
            controller.enqueue(new TextEncoder().encode(chunk.text));
            
            // Read usage if provider sent it on final chunks
            if (chunk.metadata?.usage) {
               providerTokens = {
                 inputTokens: chunk.metadata.usage.inputTokens ?? null,
                 outputTokens: chunk.metadata.usage.outputTokens ?? null,
                 totalTokens: chunk.metadata.usage.totalTokens ?? null,
               } as any;
            }
          }

          if (req.signal.aborted) {
            status = "cancelled";
          }

          if (fullResponse) {
            const metadata = allCitations.length > 0 ? JSON.stringify({ sources: allCitations }) : null;
            await createMessage(user.id, currentConversationId, "assistant", fullResponse, metadata);
          }
        } catch (err) {
          if (err instanceof RateLimitError) {
            status = "rate_limited";
          } else {
            status = "error";
          }
          if (err instanceof ProviderError) {
            console.error(`[AI Provider Error] ${err.type}: ${err.message}`);
            controller.enqueue(new TextEncoder().encode(`\n\n**Error:** ${err.message}`));
          } else {
            console.error("[AI Unknown Error]", err);
            controller.enqueue(new TextEncoder().encode(`\n\n**Error:** An unknown error occurred during generation.`));
          }
        } finally {
          controller.close();
          const reqDurationMs = Math.round(performance.now() - reqStart);
          
          // Normalize tokens if not provided by provider (only guess if managed, else allow nulls)
          if (status === "success" && providerTokens.inputTokens === null) {
            // For now, if no tokens provided by adapter, fallback to text length heuristic just to have *some* numbers
            // BUT wait! The prompt says: "If a provider does not return token counts during streaming, don't fabricate them. Allow: inputTokens = null, outputTokens = null where the underlying provider gives no trustworthy information."
            // So we DO NOT fabricate!
            // I will leave them as null.
          }

          await recordChatUsage({
            userId: user.id,
            requestId,
            conversationId: currentConversationId,
            providerId: resolved.providerId,
            modelId: resolved.modelInfo.id,
            accessType: resolved.source,
            tokens: providerTokens,
            durationMs: reqDurationMs,
            status
          }).catch(err => console.error("[Usage] Failed to record chat event:", err));
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
