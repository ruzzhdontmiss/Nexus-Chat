import { pipeline, env, TextClassificationPipeline } from "@xenova/transformers";
import { Reranker, RetrievalResult } from "@nexus/rag-contracts";

// Note: Xenova cross-encoders output logits. We can convert to probabilities if needed, 
// but sorting by logits is mathematically equivalent for ranking.
export class CrossEncoderReranker implements Reranker {
  public modelName = "Xenova/ms-marco-MiniLM-L-6-v2";
  private pipelinePromise: Promise<TextClassificationPipeline> | null = null;

  constructor() {}

  private async getPipeline(): Promise<TextClassificationPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = pipeline("text-classification", this.modelName, {
        quantized: true
      }) as unknown as Promise<TextClassificationPipeline>;
    }
    return this.pipelinePromise;
  }

  async rerank(query: string, candidates: RetrievalResult[], topK?: number): Promise<RetrievalResult[]> {
    if (candidates.length === 0) return [];
    
    const ranker = await this.getPipeline();
    
    // Create query-context pairs
    const pairs = candidates.map(c => [query, c.chunk.content]);
    
    // Cross-encoder inference
    // Transformers.js text-classification pipeline supports batched array of arrays (or flat arrays depending on model)
    // Actually, MS-MARCO expects a flat list of text pairs: pair 1, pair 2...
    // Let's run inference sequentially or in a small batch to ensure stable memory.
    const reranked: RetrievalResult[] = [];
    
    for (let i = 0; i < candidates.length; i++) {
      try {
        // @ts-ignore
        const output = await ranker(query, candidates[i].chunk.content);
        // output is like { label: 'LABEL_1', score: 0.99 } or similar depending on the exact model config.
        // For MS MARCO cross encoders, it often returns a single score or positive/negative.
        // We will just take output[0].score if it's an array, or output.score if it's an object.
        // @ts-ignore
        const score = Array.isArray(output) ? output[0].score : (output as any).score;
        reranked.push({
          chunk: candidates[i].chunk,
          score: score,
          metadata: { ...candidates[i].metadata, originalScore: candidates[i].score }
        });
      } catch (err) {
        // Fallback to original score if model fails on a chunk
        reranked.push({
          chunk: candidates[i].chunk,
          score: candidates[i].score, 
          metadata: { ...candidates[i].metadata, rerankFailed: true }
        });
      }
    }

    // Sort by new score
    reranked.sort((a, b) => b.score - a.score);

    return topK ? reranked.slice(0, topK) : reranked;
  }
}
