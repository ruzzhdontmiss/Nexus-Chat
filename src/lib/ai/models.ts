import { ModelInfo } from "./types";

export const AVAILABLE_MODELS: ModelInfo[] = [
  { 
    id: "nexus/free/mistral-small", 
    name: "Mistral Small", 
    provider: "mistral", 
    providerModelId: "mistral-small-latest",
    access: "managed",
    tier: "free",
    capabilities: { streaming: true }
  },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", contextWindow: 128000 },
  { id: "nexus/mock-fast", name: "Mock Fast", provider: "mock" },
  { id: "nexus/mock-balanced", name: "Mock Balanced", provider: "mock" },
  { id: "nexus/mock-reasoning", name: "Mock Reasoning", provider: "mock" },
];
