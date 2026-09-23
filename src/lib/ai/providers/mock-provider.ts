import { ModelChunk, ModelInfo, ModelProvider, ModelRequest, ProviderError } from "../types";
import { AVAILABLE_MODELS } from "../models";

const MOCK_RESPONSE = `This is a simulated streaming response from Nexus. 

Notice how smooth this feels? This is because the UI is progressively rendering each chunk as it arrives rather than waiting for the entire response to complete.

Here is an example of a simple function:

\`\`\`typescript
function getPerformance() {
  return "Speed + Smoothness";
}
\`\`\`

Our primary differentiator is maintaining this premium, fluid feeling regardless of backend latency.`;

export class MockProvider implements ModelProvider {
  id = "mock";

  getModels(): ModelInfo[] {
    return AVAILABLE_MODELS.filter(m => m.provider === this.id);
  }

  async *generate(request: ModelRequest): AsyncIterable<ModelChunk> {
    const { abortSignal } = request;

    if (abortSignal?.aborted) {
      throw new ProviderError("unknown", "Request aborted", abortSignal.reason);
    }

    const words = MOCK_RESPONSE.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (abortSignal?.aborted) {
        break; // Stop yielding if aborted
      }

      // Simulate token generation latency
      await new Promise(r => setTimeout(r, 10 + Math.random() * 50));
      
      const text = words[i] + (i === words.length - 1 ? '' : ' ');
      yield { text };
    }
  }
}
