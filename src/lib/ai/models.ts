import { ModelInfo } from "./types";

/**
 * Core model definitions.
 *
 * Managed models (Nexus-owned keys) and mock models live here.
 * BYOK models from specific providers live in their respective provider files
 * (e.g. OPENROUTER_MODELS, MOONSHOT_MODELS, etc.) and are registered
 * into the modelRegistry by the orchestrator.
 */
export const AVAILABLE_MODELS: ModelInfo[] = [
  // ── Nexus Managed (free tier) ────────────────────────
  {
    id: "nexus/free/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "groq",
    providerModelId: "openai/gpt-oss-120b",
    access: "managed",
    tier: "free",
    source: "managed",
    capabilities: { streaming: true },
  },
  // ── OpenAI (BYOK) ────────────────────────────────────
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    providerModelId: "gpt-4o",
    contextWindow: 128000,
    source: "byok",
    capabilities: { streaming: true },
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerModelId: "gpt-4o-mini",
    contextWindow: 128000,
    source: "byok",
    capabilities: { streaming: true },
  },
  // ── Mock (dev/testing) ───────────────────────────────
  { id: "nexus/mock-fast", name: "Mock Fast", provider: "mock", source: "managed" },
  { id: "nexus/mock-balanced", name: "Mock Balanced", provider: "mock", source: "managed" },
  { id: "nexus/mock-reasoning", name: "Mock Reasoning", provider: "mock", source: "managed" },
];
