/**
 * Anthropic Provider — STUB
 *
 * Architecture is in place but full implementation is deferred to a future ticket.
 * Registered in the provider registry so the UI can show "Anthropic" as available.
 */

import { ModelChunk, ModelInfo, ModelProvider, ModelRequest, ProviderError } from "../types";

export const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    providerModelId: "claude-sonnet-4-20250514",
    description: "Anthropic Claude Sonnet 4 — BYOK only.",
    contextWindow: 200000,
    source: "byok",
    capabilities: { streaming: true },
  },
];

export class AnthropicProvider implements ModelProvider {
  public id = "anthropic";

  getModels(): ModelInfo[] {
    return ANTHROPIC_MODELS;
  }

  async *generate(_request: ModelRequest): AsyncIterable<ModelChunk> {
    throw new ProviderError(
      "provider_unavailable",
      "Anthropic direct integration is coming soon. Use OpenRouter to access Claude models now."
    );
  }
}
