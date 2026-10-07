import { pipeline, env, FeatureExtractionPipeline } from "@xenova/transformers";
import { EmbeddingProvider } from "@nexus/rag-contracts";

// Configure transformers to not download models if we want to point to a local cache,
// but for standard usage, let it cache locally in the node environment.
env.allowLocalModels = true;
env.useBrowserCache = false; // We are in Node

export class BGEEmbeddingProvider implements EmbeddingProvider {
  public modelName = "Xenova/bge-small-en-v1.5";
  public dimensions = 384;
  
  private extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

  constructor() {}

  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractorPromise) {
      this.extractorPromise = pipeline("feature-extraction", this.modelName, {
        quantized: true // Keep true for faster, lightweight inference
      }) as unknown as Promise<FeatureExtractionPipeline>;
    }
    return this.extractorPromise;
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data) as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getExtractor();
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    // output is a tensor, we need to chunk it by dimensions
    const allData = Array.from(output.data) as number[];
    const result: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      result.push(allData.slice(i * this.dimensions, (i + 1) * this.dimensions));
    }
    return result;
  }
}
