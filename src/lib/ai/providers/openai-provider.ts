import { OpenAI } from "openai";
import { ModelChunk, ModelInfo, ModelProvider, ModelRequest, ProviderError, ModelMessage } from "../types";
import { AVAILABLE_MODELS } from "../models";

export class OpenAIProvider implements ModelProvider {
  id = "openai";

  getModels(): ModelInfo[] {
    return AVAILABLE_MODELS.filter(m => m.provider === this.id);
  }

  private mapRole(role: ModelMessage["role"]): "system" | "user" | "assistant" {
    return role;
  }

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    // credentialKey injected server-side by ModelResolver — never from the client
    const apiKey = request.credentialKey;
    if (!apiKey) {
      throw new ProviderError("auth_failure", "OpenAI API key is not configured. Connect your OpenAI key in Settings → AI Providers.");
    }

    const client = new OpenAI({ apiKey });
    const { abortSignal, messages, modelId, temperature, maxTokens } = request;

    if (abortSignal?.aborted) {
      throw new ProviderError("unknown", "Request aborted before provider connection", abortSignal.reason);
    }

    try {
      const stream = await client.chat.completions.create({
        model: modelId,
        messages: messages.map(msg => ({
          role: this.mapRole(msg.role),
          content: msg.content
        })),
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        stream: true,
      }, {
        signal: abortSignal,
      });

      for await (const chunk of stream) {
        if (abortSignal?.aborted) break;
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) yield { text };
      }
    } catch (error: any) {
      if (error?.name === "AbortError" || abortSignal?.aborted) {
        throw new ProviderError("unknown", "Request aborted during generation", error);
      }
      const status = error?.status;
      if (status === 401 || status === 403) {
        throw new ProviderError("auth_failure", "Authentication failed with OpenAI. Check your API key.", error);
      }
      if (status === 429) {
        throw new ProviderError("rate_limited", "OpenAI rate limit exceeded.", error);
      }
      if (status === 404) {
        throw new ProviderError("unsupported_model", `Model ${modelId} not found or unsupported by OpenAI.`, error);
      }
      if (status >= 500) {
        throw new ProviderError("provider_unavailable", "OpenAI is currently unavailable.", error);
      }
      throw new ProviderError("invalid_request", error?.message || "Invalid request to OpenAI.", error);
    }
  }
}
