/**
 * Z.AI / GLM Provider
 *
 * GLM uses an OpenAI-compatible API via api.z.ai.
 * BYOK only — user must connect their own Z.AI API key.
 */

import { OpenAI } from "openai";
import { ModelChunk, ModelInfo, ModelProvider, ModelRequest, ProviderError } from "../types";

export const GLM_MODELS: ModelInfo[] = [
  {
    id: "glm/glm-4-plus",
    name: "GLM-4 Plus",
    provider: "glm",
    providerModelId: "glm-4-plus",
    description: "Z.AI GLM-4 Plus — flagship model.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "glm/glm-4-flash",
    name: "GLM-4 Flash",
    provider: "glm",
    providerModelId: "glm-4-flash",
    description: "Z.AI GLM-4 Flash — fast and efficient.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "glm/glm-z1-flash",
    name: "GLM-Z1 Flash",
    provider: "glm",
    providerModelId: "glm-z1-flash",
    description: "Z.AI GLM-Z1 Flash reasoning model.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
];

export class GLMProvider implements ModelProvider {
  public id = "glm";

  getModels(): ModelInfo[] {
    return GLM_MODELS;
  }

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    const modelInfo = this.getModels().find(m => m.id === request.modelId);
    if (!modelInfo || !modelInfo.providerModelId) {
      throw new ProviderError("unsupported_model", `Model ${request.modelId} is not supported by Z.AI/GLM.`);
    }

    const apiKey = request.credentialKey;
    if (!apiKey) {
      throw new ProviderError("auth_failure", "No Z.AI API key found. Connect your key in Settings → AI Providers.");
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.z.ai/api/paas/v4",
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
      if (status === 401 || status === 403) throw new ProviderError("auth_failure", "Z.AI authentication failed. Check your API key.", error);
      if (status === 429) throw new ProviderError("rate_limited", "Z.AI rate limit reached.", error);
      if (status >= 500) throw new ProviderError("provider_unavailable", "Z.AI is temporarily unavailable.", error);
      throw new ProviderError("unknown", "Z.AI returned an unexpected error.", error);
    }
  }
}
