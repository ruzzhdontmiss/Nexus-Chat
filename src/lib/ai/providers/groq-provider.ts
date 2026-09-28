import Groq from "groq-sdk";
import { ModelChunk, ModelInfo, ModelProvider, ModelRequest, ProviderError, ModelMessage } from "../types";
import { modelRegistry } from "../registry";

export class GroqProvider implements ModelProvider {
  id = "groq";

  getModels(): ModelInfo[] {
    return modelRegistry.getAll().filter((m) => m.provider === this.id);
  }

  private mapRole(role: ModelMessage["role"]): "system" | "user" | "assistant" {
    return role;
  }

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    const modelInfo = this.getModels().find((m) => m.id === request.modelId);
    if (!modelInfo || !modelInfo.providerModelId) {
      throw new ProviderError("unsupported_model", `Model ${request.modelId} is not supported by Groq provider.`);
    }

    const apiKey = request.credentialKey;
    if (!apiKey) {
      throw new ProviderError("auth_failure", "Groq API key is not configured.");
    }

    const client = new Groq({ apiKey });
    const { abortSignal, messages, temperature, maxTokens } = request;

    if (abortSignal?.aborted) {
      throw new ProviderError("unknown", "Request aborted before provider connection", abortSignal.reason);
    }

    try {
      const stream = await client.chat.completions.create(
        {
          model: modelInfo.providerModelId,
          messages: messages.map((msg) => ({
            role: this.mapRole(msg.role),
            content: msg.content,
          })),
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens,
          stream: true,
        },
        {
          signal: abortSignal,
        }
      );

      for await (const chunk of stream) {
        if (abortSignal?.aborted) break;
        const text = chunk.choices[0]?.delta?.content || "";
        
        // Groq may return usage data in the final chunk (x-groq property)
        // Wait, Groq returns usage if stream_options: { include_usage: true } is passed (OpenAI compatible)
        // Let's rely on standard delta content first
        let usage = undefined;
        if ((chunk as any).x_groq?.usage) {
           usage = {
             inputTokens: (chunk as any).x_groq.usage.prompt_tokens,
             outputTokens: (chunk as any).x_groq.usage.completion_tokens,
             totalTokens: (chunk as any).x_groq.usage.total_tokens,
           };
        } else if ((chunk as any).usage) {
           usage = {
             inputTokens: (chunk as any).usage.prompt_tokens,
             outputTokens: (chunk as any).usage.completion_tokens,
             totalTokens: (chunk as any).usage.total_tokens,
           };
        }

        if (text || usage) {
          yield { 
            text, 
            ...(usage ? { metadata: { usage } } : {})
          };
        }
      }
    } catch (error: any) {
      if (error?.name === "AbortError" || abortSignal?.aborted) {
        throw new ProviderError("unknown", "Request aborted during generation", error);
      }
      const status = error?.status;
      if (status === 401 || status === 403) {
        throw new ProviderError("auth_failure", "Authentication failed with Groq. Check your API key.", error);
      }
      if (status === 429) {
        throw new ProviderError("rate_limited", "Groq rate limit exceeded.", error);
      }
      if (status === 404) {
        throw new ProviderError("unsupported_model", `Model ${modelInfo.providerModelId} not found or unsupported by Groq.`, error);
      }
      if (status >= 500) {
        throw new ProviderError("provider_unavailable", "Groq is currently unavailable.", error);
      }
      throw new ProviderError("invalid_request", error?.message || "Invalid request to Groq.", error);
    }
  }
}
