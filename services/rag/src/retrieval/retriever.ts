import { 
  Retriever, 
  RetrievalContext, 
  HybridRetriever, 
  Reranker, 
  ContextCompressor,
  SourceCitation
} from "@nexus/rag-contracts";
import { generateSnippet } from "../utils/text-utils.js";

export class NexusRetriever implements Retriever {
  constructor(
    private hybridRetriever: HybridRetriever,
    private reranker: Reranker,
    private compressor: ContextCompressor
  ) {}

  async retrieve(query: string, filter?: Record<string, any>): Promise<RetrievalContext> {
    const t0 = performance.now();
    
    // 1. Hybrid Retrieval (Vector + BM25)
    // Hybrid retrieval internal timing can be roughly inferred, but we'll measure the whole block.
    const candidates = await this.hybridRetriever.search(query, 20, filter);
    const t1 = performance.now();

    // 2. Reranking
    const reranked = await this.reranker.rerank(query, candidates, 10);
    const t2 = performance.now();

    // 3. Compression
    const finalContext = await this.compressor.compress(query, reranked);
    const t3 = performance.now();

    // 4. Source Extraction
    const citations: SourceCitation[] = finalContext.map(res => ({
      id: res.chunk.id,
      type: "document",
      title: res.chunk.metadata?.filename || "Document",
      page: res.chunk.pageStart,
      section: res.chunk.sectionTitle,
      chunkId: res.chunk.id,
      snippet: generateSnippet(res.chunk.content, 350)
    }));

    // Diagnostic counts (we can infer vector/bm25 candidates by looking at metadata if we wanted, 
    // but we'll just report the pipeline aggregates)
    let vectorCandidateCount = 0;
    let bm25CandidateCount = 0;
    candidates.forEach(c => {
      if (c.metadata?.vectorRank) vectorCandidateCount++;
      if (c.metadata?.bm25Rank) bm25CandidateCount++;
    });

    return {
      query,
      results: finalContext,
      citations,
      diagnostics: {
        vectorCandidateCount,
        bm25CandidateCount,
        fusedCandidateCount: candidates.length,
        rerankedCount: reranked.length,
        finalContextCount: finalContext.length,
        retrievalLatencyMs: Math.round(t1 - t0),
        rerankingLatencyMs: Math.round(t2 - t1),
        compressionLatencyMs: Math.round(t3 - t2)
      }
    };
  }
}
