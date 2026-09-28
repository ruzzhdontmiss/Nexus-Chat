export type ModelMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export type ModelRequest = {
  modelId: string;
  messages: ModelMessage[];
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
  /**
   * Decrypted credential injected server-side by ModelResolver.
   * NEVER accept this from the client — the route must always derive it server-side.
   */
  credentialKey?: string;
};

export type ModelChunk = {
  text: string;
  metadata?: {
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    }
  };
};

export type AuthMethod = "api_key" | "oauth" | "managed";

export type ProviderCapabilities = {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
};

export type ProviderDefinition = {
  id: string;
  name: string;
  description: string;
  authMethods: AuthMethod[];
  capabilities: ProviderCapabilities;
  supportsDynamicModels: boolean;
  /** If false, the auth method is registered but not yet implemented. */
  implemented: boolean;
};

export type ModelSource = "managed" | "byok";

export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
  providerModelId?: string;
  description?: string;
  contextWindow?: number;
  access?: "managed" | "byok" | "oauth";
  tier?: "free" | "paid";
  source?: ModelSource;
  capabilities?: {
    streaming: boolean;
  };
};

export interface ModelProvider {
  id: string;
  getModels(): ModelInfo[];
  generate(request: ModelRequest): AsyncIterable<ModelChunk>;
}

export type ErrorType =
  | "invalid_request"
  | "unsupported_model"
  | "provider_unavailable"
  | "rate_limited"
  | "auth_failure"
  | "unknown";

export class ProviderError extends Error {
  constructor(public type: ErrorType, message: string, public cause?: unknown) {
    super(message);
    this.name = "ProviderError";
  }
}

