/**
 * OpenRouter Provider
 *
 * Uses the OpenAI-compatible SDK pointing at openrouter.ai.
 * credentialKey is injected by ModelResolver (never from client).
 *
 * Static curated model list — OpenRouter has 300+ models;
 * we expose a sensible curated selection with dynamic discovery planned for later.
 */

import { OpenAI } from "openai";
import { ModelChunk, ModelInfo, ModelProvider, ModelRequest, ProviderError } from "../types";

// Curated static model list — a representative cross-section of top OpenRouter models
export const OPENROUTER_MODELS: ModelInfo[] = [
  {
    id: "openrouter/deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "openrouter",
    providerModelId: "deepseek/deepseek-r1",
    description: "DeepSeek's reasoning model, comparable to o1.",
    contextWindow: 164000,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openrouter/deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek V3",
    provider: "openrouter",
    providerModelId: "deepseek/deepseek-chat-v3-0324",
    description: "DeepSeek V3, fast and capable general assistant.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openrouter/qwen/qwen3-235b-a22b",
    name: "Qwen3 235B",
    provider: "openrouter",
    providerModelId: "qwen/qwen3-235b-a22b",
    description: "Alibaba's largest Qwen3 MoE model.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openrouter/google/gemma-3-27b-it",
    name: "Gemma 3 27B",
    provider: "openrouter",
    providerModelId: "google/gemma-3-27b-it",
    description: "Google's Gemma 3 27B instruction-tuned model.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openrouter/meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "openrouter",
    providerModelId: "meta-llama/llama-4-maverick",
    description: "Meta's Llama 4 Maverick — fast multimodal model.",
    contextWindow: 524288,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openrouter/moonshotai/kimi-k2",
    name: "Kimi K2",
    provider: "openrouter",
    providerModelId: "moonshotai/kimi-k2",
    description: "Moonshot's Kimi K2, strong coding and reasoning.",
    contextWindow: 131072,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openrouter/anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "openrouter",
    providerModelId: "anthropic/claude-sonnet-4-5",
    description: "Anthropic's Claude Sonnet 4.5 via OpenRouter.",
    contextWindow: 200000,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openrouter/openai/gpt-4o",
    name: "GPT-4o",
    provider: "openrouter",
    providerModelId: "openai/gpt-4o",
    description: "OpenAI GPT-4o via OpenRouter.",
    contextWindow: 128000,
    source: "byok",
    capabilities: { streaming: true },
  },
];

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export class OpenRouterProvider implements ModelProvider {
  public id = "openrouter";

  getModels(): ModelInfo[] {
    return OPENROUTER_MODELS;
  }

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    const modelInfo = this.getModels().find(m => m.id === request.modelId);
    if (!modelInfo || !modelInfo.providerModelId) {
      throw new ProviderError("unsupported_model", `Model ${request.modelId} is not available on OpenRouter.`);
    }

    // credentialKey injected by ModelResolver — never from client
    const apiKey = request.credentialKey;
    if (!apiKey) {
      throw new ProviderError("auth_failure", "No OpenRouter API key found. Connect your key in Settings → AI Providers.");
    }

    const client = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXTAUTH_URL || "https://nexus.ai",
        "X-Title": "Nexus",
      },
    });

    const { abortSignal, messages, temperature, maxTokens } = request;

    try {
      const stream = await client.chat.completions.create({
        model: modelInfo.providerModelId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
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
      if (error?.name === "AbortError" || abortSignal?.aborted) {
        throw new ProviderError("unknown", "Request aborted", error);
      }
      const status = error?.status;
      if (status === 401 || status === 403) {
        throw new ProviderError("auth_failure", "OpenRouter authentication failed. Check your API key.", error);
      }
      if (status === 429) {
        throw new ProviderError("rate_limited", "OpenRouter rate limit reached.", error);
      }
      if (status === 404) {
        throw new ProviderError("unsupported_model", `Model not found on OpenRouter.`, error);
      }
      if (status >= 500) {
        throw new ProviderError("provider_unavailable", "OpenRouter is temporarily unavailable.", error);
      }
      throw new ProviderError("unknown", "OpenRouter returned an unexpected error.", error);
    }
  }
}
