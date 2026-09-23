import { ModelProvider, ModelRequest, ModelChunk, ProviderError } from "./types";
import { modelRegistry } from "./registry";
import { MockProvider } from "./providers/mock-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import { MistralProvider } from "./providers/mistral-provider";
import { AVAILABLE_MODELS } from "./models";

// Initialize registry
AVAILABLE_MODELS.forEach(m => modelRegistry.register(m));

const providers: Map<string, ModelProvider> = new Map();

export const AIOrchestrator = {
  registerProvider(provider: ModelProvider) {
    providers.set(provider.id, provider);
  },

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    try {
      const modelInfo = modelRegistry.get(request.modelId);
      const provider = providers.get(modelInfo.provider);
      
      if (!provider) {
        throw new ProviderError("provider_unavailable", `Provider ${modelInfo.provider} is not registered.`);
      }

      yield* provider.generate(request);
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error; // Propagate normalized errors
      }
      throw new ProviderError("unknown", "An unknown error occurred during generation.", error);
    }
  }
};

// Bootstrap providers
AIOrchestrator.registerProvider(new MockProvider());
AIOrchestrator.registerProvider(new OpenAIProvider());
AIOrchestrator.registerProvider(new MistralProvider());
