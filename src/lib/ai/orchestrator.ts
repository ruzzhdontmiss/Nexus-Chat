import { ModelProvider, ModelRequest, ModelChunk, ProviderError } from "./types";
import { modelRegistry } from "./registry";
import { MockProvider } from "./providers/mock-provider";
import { GroqProvider } from "./providers/groq-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import { MistralProvider } from "./providers/mistral-provider";
import { OpenRouterProvider, OPENROUTER_MODELS } from "./providers/openrouter-provider";
import { MoonshotProvider, MOONSHOT_MODELS } from "./providers/moonshot-provider";
import { GLMProvider, GLM_MODELS } from "./providers/glm-provider";
import { AnthropicProvider, ANTHROPIC_MODELS } from "./providers/anthropic-provider";
import { AVAILABLE_MODELS } from "./models";

// Initialize model registry with all models from all providers
AVAILABLE_MODELS.forEach(m => modelRegistry.register(m));
OPENROUTER_MODELS.forEach(m => modelRegistry.register(m));
MOONSHOT_MODELS.forEach(m => modelRegistry.register(m));
GLM_MODELS.forEach(m => modelRegistry.register(m));
ANTHROPIC_MODELS.forEach(m => modelRegistry.register(m));

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

// Bootstrap all providers
AIOrchestrator.registerProvider(new MockProvider());
AIOrchestrator.registerProvider(new GroqProvider());
AIOrchestrator.registerProvider(new OpenAIProvider());
AIOrchestrator.registerProvider(new MistralProvider());
AIOrchestrator.registerProvider(new OpenRouterProvider());
AIOrchestrator.registerProvider(new MoonshotProvider());
AIOrchestrator.registerProvider(new GLMProvider());
AIOrchestrator.registerProvider(new AnthropicProvider());
