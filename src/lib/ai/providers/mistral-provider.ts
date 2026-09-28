import { Mistral } from "@mistralai/mistralai";
import { ModelProvider, ModelRequest, ModelChunk, ProviderError, ModelInfo } from "../types";
import { AVAILABLE_MODELS } from "../models";

export class MistralProvider implements ModelProvider {
  public id = "mistral";

  getModels(): ModelInfo[] {
    return AVAILABLE_MODELS.filter(m => m.provider === this.id);
  }

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    const modelInfo = this.getModels().find(m => m.id === request.modelId);
    if (!modelInfo || !modelInfo.providerModelId) {
      throw new ProviderError("unsupported_model", `Model ${request.modelId} is not supported by Mistral provider.`);
    }

    // credentialKey is injected server-side by ModelResolver — never from the client
    const apiKey = request.credentialKey;
    if (!apiKey) {
      throw new ProviderError("auth_failure", "Mistral API key is not configured.");
    }

    const client = new Mistral({ apiKey });

    try {
      const response = await client.chat.stream({
        model: modelInfo.providerModelId,
        messages: request.messages.map(msg => ({
          role: msg.role as any,
          content: msg.content,
        })),
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      for await (const chunk of response) {
        if (request.abortSignal?.aborted) {
          break;
        }

        const content = chunk.data.choices[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) {
          yield { text: content };
        }
      }
    } catch (error: any) {
      const status = error?.status || error?.statusCode || error?.raw_status_code;
      if (status === 401 || status === 403) {
        throw new ProviderError("auth_failure", "Mistral authentication failed. Check your API key.", error);
      }
      if (status === 429) {
        throw new ProviderError("rate_limited", "Mistral rate limit reached.", error);
      }
      if (status === 400) {
        throw new ProviderError("invalid_request", error.message || "Invalid request to Mistral.", error);
      }
      throw new ProviderError("unknown", "Mistral is temporarily unavailable.", error);
    }
  }
}

