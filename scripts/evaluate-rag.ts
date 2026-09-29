import "dotenv/config";
import { db } from "@/prisma/db";
import { IngestionPipeline } from "@/lib/rag/ingestion/pipeline";
import { PrismaVectorStore } from "@/lib/rag/retrieval/vector-store";
import { BM25Retriever } from "@/lib/rag/retrieval/bm25";
import { RRFHybridRetriever } from "@/lib/rag/retrieval/hybrid";
import { CrossEncoderReranker } from "@/lib/rag/retrieval/reranker";
import { BGEEmbeddingProvider } from "@/lib/rag/embeddings/bge-provider";
import fs from "fs/promises";

interface EvalDataset {
  question: string;
  expectedKeyword: string;
}

const dataset: EvalDataset[] = [
  { question: "What is this document about?", expectedKeyword: "Page 1 Content goes here" },
  { question: "Are there any security requirements?", expectedKeyword: "security requirements" }
];

async function main() {
  console.log("=== SETUP ===");
  let user = await db.orm.public.User.first();
  if (!user) {
    user = await db.orm.public.User.create({
      id: "eval-user",
      email: "evaluator@example.com",
      name: "Evaluator"
    });
  }
  const userId = user.id;
  const pipeline = new IngestionPipeline();
  
  const buf = await fs.readFile("test-multipage2.pdf");
  const documentId = await pipeline.processPdfBuffer(userId, "eval.pdf", buf);
  console.log("Ingested Document ID:", documentId);

  const vectorStore = new PrismaVectorStore();
  const bm25 = new BM25Retriever();
  const embed = new BGEEmbeddingProvider();
  const hybrid = new RRFHybridRetriever(vectorStore, bm25, embed);
  const reranker = new CrossEncoderReranker();

  console.log("\n=== RUNNING EVALUATION ===");
  
  for (const data of dataset) {
    console.log(`\nQuery: "${data.question}"`);
    
    // 1. Vector
    const qEmb = await embed.embed(data.question);
    const vRes = await vectorStore.search(qEmb, 5, { userId, documentId });
    const vHit = vRes.some(r => r.chunk.content.includes(data.expectedKeyword));
    console.log(`- Vector Hit: ${vHit}`);
    
    // 2. BM25
    const bRes = await bm25.search(data.question, 5, { userId, documentId });
    const bHit = bRes.some(r => r.chunk.content.includes(data.expectedKeyword));
    console.log(`- BM25 Hit: ${bHit}`);

    // 3. Hybrid
    const hRes = await hybrid.search(data.question, 5, { userId, documentId });
    const hHit = hRes.some(r => r.chunk.content.includes(data.expectedKeyword));
    console.log(`- Hybrid Hit: ${hHit}`);

    // 4. Hybrid + Reranker
    const rrRes = await reranker.rerank(data.question, hRes, 3);
    const rrHit = rrRes.some(r => r.chunk.content.includes(data.expectedKeyword));
    console.log(`- Rerank Hit: ${rrHit}`);
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch(console.error);
