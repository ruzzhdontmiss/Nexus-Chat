export interface Document {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  status: "uploaded" | "processing" | "ready" | "failed";
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageStart?: number;
  pageEnd?: number;
  sectionTitle?: string;
  tokenCount?: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  modelName: string;
  dimensions: number;
}

export interface VectorStore {
  add(chunks: DocumentChunk[], embeddings: number[][]): Promise<void>;
  search(embedding: number[], topK: number, filter?: Record<string, any>): Promise<RetrievalResult[]>;
}

export interface LexicalRetriever {
  search(query: string, topK: number, filter?: Record<string, any>): Promise<RetrievalResult[]>;
  index(chunks: DocumentChunk[]): Promise<void>;
}

export interface HybridRetriever {
  search(query: string, topK: number, filter?: Record<string, any>): Promise<RetrievalResult[]>;
}

export interface Reranker {
  rerank(query: string, candidates: RetrievalResult[], topK?: number): Promise<RetrievalResult[]>;
}

export interface ContextCompressor {
  compress(query: string, context: RetrievalResult[]): Promise<RetrievalResult[]>;
}

export interface Retriever {
  retrieve(query: string, filter?: Record<string, any>): Promise<RetrievalContext>;
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  score: number;
  metadata?: Record<string, any>;
}

export interface SourceCitation {
  id: string;
  type: "document" | "web";
  title: string;
  url?: string;
  page?: number;
  section?: string;
  snippet?: string;
  chunkId?: string;
}

export interface RetrievalContext {
  query: string;
  results: RetrievalResult[]; // Final results after compression
  citations: SourceCitation[];
  diagnostics: {
    vectorCandidateCount?: number;
    bm25CandidateCount?: number;
    fusedCandidateCount?: number;
    rerankedCount?: number;
    finalContextCount?: number;
    retrievalLatencyMs?: number;
    rerankingLatencyMs?: number;
    compressionLatencyMs?: number;
  };
}
