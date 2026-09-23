/**
 * Moonshot / Kimi Provider
 *
 * Moonshot's API is OpenAI-compatible with a different base URL.
 * BYOK only — user must connect their own Moonshot API key.
 */

import { OpenAI } from "openai";
import { ModelChunk, ModelInfo, ModelProvider, ModelRequest, ProviderError } from "../types";

export const MOONSHOT_MODELS: ModelInfo[] = [
  {
    id: "moonshot/moonshot-v1-8k",
    name: "Kimi (8k)",
    provider: "moonshot",
    providerModelId: "moonshot-v1-8k",
    description: "Moonshot Kimi — fast, 8k context.",
    contextWindow: 8192,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "moonshot/moonshot-v1-32k",
    name: "Kimi (32k)",
    provider: "moonshot",
    providerModelId: "moonshot-v1-32k",
    description: "Moonshot Kimi — 32k context.",
    contextWindow: 32768,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "moonshot/moonshot-v1-128k",
    name: "Kimi (128k)",
    provider: "moonshot",
    providerModelId: "moonshot-v1-128k",
    description: "Moonshot Kimi — long-context 128k.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
];

export class MoonshotProvider implements ModelProvider {
  public id = "moonshot";

  getModels(): ModelInfo[] {
    return MOONSHOT_MODELS;
  }

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    const modelInfo = this.getModels().find(m => m.id === request.modelId);
    if (!modelInfo || !modelInfo.providerModelId) {
      throw new ProviderError("unsupported_model", `Model ${request.modelId} is not supported by Moonshot.`);
    }

    const apiKey = request.credentialKey;
    if (!apiKey) {
      throw new ProviderError("auth_failure", "No Moonshot API key found. Connect your key in Settings → AI Providers.");
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.moonshot.cn/v1",
    });

    const { abortSignal, messages, temperature, maxTokens } = request;

    try {
      const stream = await client.chat.completions.create({
        model: modelInfo.providerModelId,
        messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        stream: true,
      }, { signal: abortSignal });

      for await (const chunk of stream) {
        if (abortSignal?.aborted) break;
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) yield { text };
      }
    } catch (error: any) {
      const status = error?.status;
      if (status === 401 || status === 403) throw new ProviderError("auth_failure", "Moonshot authentication failed. Check your API key.", error);
      if (status === 429) throw new ProviderError("rate_limited", "Moonshot rate limit reached.", error);
      if (status >= 500) throw new ProviderError("provider_unavailable", "Moonshot is temporarily unavailable.", error);
      throw new ProviderError("unknown", "Moonshot returned an unexpected error.", error);
    }
  }
}
