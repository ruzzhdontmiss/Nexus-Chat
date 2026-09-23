import { ModelInfo, ProviderError } from "./types";

const registeredModels: Map<string, ModelInfo> = new Map();

export const modelRegistry = {
  register(model: ModelInfo) {
    registeredModels.set(model.id, model);
  },

  getAll(): ModelInfo[] {
    return Array.from(registeredModels.values());
  },

  get(modelId: string): ModelInfo {
    const model = registeredModels.get(modelId);
    if (!model) {
      throw new ProviderError("unsupported_model", `Model ${modelId} is not registered.`);
    }
    return model;
  }
};
