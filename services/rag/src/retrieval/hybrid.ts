import { HybridRetriever, LexicalRetriever, RetrievalResult, VectorStore, EmbeddingProvider } from "@nexus/rag-contracts";

export class RRFHybridRetriever implements HybridRetriever {
  private rrfK = 60; // Standard RRF constant

  constructor(
    private vectorStore: VectorStore,
    private lexicalRetriever: LexicalRetriever,
    private embeddingProvider: EmbeddingProvider
  ) {}

  async search(query: string, topK: number, filter?: Record<string, any>): Promise<RetrievalResult[]> {
    const fetchTopK = Math.max(topK * 2, 50);

    // 1. Vector Search
    const embedding = await this.embeddingProvider.embed(query);
    const vectorResults = await this.vectorStore.search(embedding, fetchTopK, filter);

    // 2. BM25 Search
    const bm25Results = await this.lexicalRetriever.search(query, fetchTopK, filter);

    // 3. RRF Fusion
    const fusedMap = new Map<string, RetrievalResult>();

    // Add Vector ranks
    vectorResults.forEach((res, rank) => {
      const rrfScore = 1 / (this.rrfK + rank + 1); // 1-indexed rank
      fusedMap.set(res.chunk.id, {
        chunk: res.chunk,
        score: rrfScore,
        metadata: { vectorRank: rank + 1, vectorScore: res.score }
      });
    });

    // Add BM25 ranks
    bm25Results.forEach((res, rank) => {
      const rrfScore = 1 / (this.rrfK + rank + 1);
      if (fusedMap.has(res.chunk.id)) {
        const existing = fusedMap.get(res.chunk.id)!;
        existing.score += rrfScore;
        existing.metadata = { ...existing.metadata, bm25Rank: rank + 1, bm25Score: res.score };
      } else {
        fusedMap.set(res.chunk.id, {
          chunk: res.chunk,
          score: rrfScore,
          metadata: { bm25Rank: rank + 1, bm25Score: res.score }
        });
      }
    });

    // Sort by combined RRF score
    const sorted = Array.from(fusedMap.values()).sort((a, b) => b.score - a.score);

    return sorted.slice(0, topK);
  }
}
