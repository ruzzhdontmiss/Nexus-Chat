import { BGEEmbeddingProvider } from "./embeddings/bge-provider.js";
import { PrismaVectorStore } from "./retrieval/vector-store.js";
import { BM25Retriever } from "./retrieval/bm25.js";
import { RRFHybridRetriever } from "./retrieval/hybrid.js";
import { CrossEncoderReranker } from "./retrieval/reranker.js";
import { SimpleContextCompressor } from "./retrieval/compressor.js";
import { NexusRetriever } from "./retrieval/retriever.js";

const embeddingProvider = new BGEEmbeddingProvider();
const vectorStore = new PrismaVectorStore();
const lexicalRetriever = new BM25Retriever();
const hybridRetriever = new RRFHybridRetriever(vectorStore, lexicalRetriever, embeddingProvider);
const reranker = new CrossEncoderReranker();
const compressor = new SimpleContextCompressor();

export const ragRetriever = new NexusRetriever(hybridRetriever, reranker, compressor);
