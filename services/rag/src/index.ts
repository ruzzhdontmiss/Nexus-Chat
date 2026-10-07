import { BGEEmbeddingProvider } from "./embeddings/bge-provider";
import { PrismaVectorStore } from "./retrieval/vector-store";
import { BM25Retriever } from "./retrieval/bm25";
import { RRFHybridRetriever } from "./retrieval/hybrid";
import { CrossEncoderReranker } from "./retrieval/reranker";
import { SimpleContextCompressor } from "./retrieval/compressor";
import { NexusRetriever } from "./retrieval/retriever";

const embeddingProvider = new BGEEmbeddingProvider();
const vectorStore = new PrismaVectorStore();
const lexicalRetriever = new BM25Retriever();
const hybridRetriever = new RRFHybridRetriever(vectorStore, lexicalRetriever, embeddingProvider);
const reranker = new CrossEncoderReranker();
const compressor = new SimpleContextCompressor();

export const ragRetriever = new NexusRetriever(hybridRetriever, reranker, compressor);
