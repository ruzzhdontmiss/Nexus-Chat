/**
 * Static registry of supported AI providers.
 * This is the source of truth for provider metadata — no hardcoding in React components.
 *
 * Note on OAuth: The authMethods array may include "oauth" as an architecture placeholder.
 * Only implement OAuth when the provider officially supports third-party authorization.
 * Never implement unofficial flows (scraping, cookie reuse, session hijacking).
 */

import { ProviderDefinition } from "./types";

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: "mistral",
    name: "Mistral",
    description: "Mistral AI — efficient, capable models with native streaming.",
    authMethods: ["api_key", "managed"],
    capabilities: { streaming: true, tools: false, vision: false },
    supportsDynamicModels: false,
    implemented: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Gateway to 300+ models from all major providers via a unified API.",
    authMethods: ["api_key"],
    capabilities: { streaming: true, tools: false, vision: false },
    supportsDynamicModels: true,
    implemented: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4 Turbo, and more — BYOK via OpenAI API key.",
    authMethods: ["api_key"],
    capabilities: { streaming: true, tools: true, vision: true },
    supportsDynamicModels: false,
    implemented: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude Opus — BYOK via Anthropic API key.",
    authMethods: ["api_key"],
    capabilities: { streaming: true, tools: true, vision: true },
    supportsDynamicModels: false,
    implemented: false, // Adapter stub only — full implementation in future ticket
  },
  {
    id: "google",
    name: "Google AI",
    description: "Gemini 2.0 Flash, Gemini Pro — BYOK via Google AI Studio API key.",
    authMethods: ["api_key"],
    capabilities: { streaming: true, tools: true, vision: true },
    supportsDynamicModels: false,
    implemented: false, // Adapter stub only — full implementation in future ticket
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi",
    description: "Kimi K2 and Moonshot models — BYOK via Moonshot API key.",
    authMethods: ["api_key"],
    capabilities: { streaming: true, tools: false, vision: false },
    supportsDynamicModels: false,
    implemented: true,
  },
  {
    id: "glm",
    name: "Z.AI / GLM",
    description: "GLM-4 and Z.AI models — BYOK via Z.AI API key.",
    authMethods: ["api_key"],
    capabilities: { streaming: true, tools: false, vision: false },
    supportsDynamicModels: false,
    implemented: true,
  },
];

/** Map for O(1) lookups by provider ID */
const PROVIDER_MAP = new Map(PROVIDER_DEFINITIONS.map((p) => [p.id, p]));

export function getProvider(id: string): ProviderDefinition | undefined {
  return PROVIDER_MAP.get(id);
}

export function getAllProviders(): ProviderDefinition[] {
  return PROVIDER_DEFINITIONS;
}
