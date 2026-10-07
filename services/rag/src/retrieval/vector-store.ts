import { db } from "../db/client.js";
import { DocumentChunk, RetrievalResult, VectorStore } from "@nexus/rag-contracts";

export class PrismaVectorStore implements VectorStore {
  async add(chunks: DocumentChunk[], embeddings: number[][]): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error("Chunks and embeddings length mismatch");
    }

    // Insert chunks using db.orm
    // Since Prisma 8 has pgvector extension support, we can pass vectors as arrays or formatted strings
    // Depending on exactly how the Prisma 8 pgvector adapter expects it, arrays of numbers work.
    
    // We will do bulk creation via a transaction or multiple inserts
    await db.transaction(async (tx) => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const emb = embeddings[i];
        await tx.orm.public.DocumentChunk.create({
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          sectionTitle: chunk.sectionTitle,
          tokenCount: chunk.tokenCount,
          embedding: emb,
          metadata: chunk.metadata ? JSON.stringify(chunk.metadata) : null,
        });
      }
    });
  }

  async search(embedding: number[], topK: number, filter?: Record<string, any>): Promise<RetrievalResult[]> {
    const userId = filter?.userId;
    if (!userId) {
      throw new Error("VectorStore search requires a userId filter for security isolation");
    }

    const documentId = filter?.documentId;

    // Fetch chunks and do in-memory similarity for the prototype to avoid raw SQL typing issues
    // In a production system, this would use a raw SQL query with pgvector <-> operator.
    let chunks;
    if (documentId) {
      chunks = await db.orm.public.DocumentChunk
        // @ts-ignore
        .include('document')
        .where({ documentId })
        .all();
      chunks = chunks.filter((c: any) => c.document.userId === userId);
    } else {
      chunks = await db.orm.public.DocumentChunk
        // @ts-ignore
        .include('document')
        .all();
      chunks = chunks.filter((c: any) => c.document.userId === userId);
    }

    const results = chunks.map((row: any) => {
      // Compute cosine similarity (dot product since BGE vectors are normalized)
      let score = 0;
      if (row.embedding) {
        let dotProduct = 0;
        for (let i = 0; i < embedding.length; i++) {
          dotProduct += embedding[i] * row.embedding[i];
        }
        score = dotProduct;
      }

      return {
        chunk: {
          id: row.id,
          documentId: row.documentId,
          content: row.content,
          chunkIndex: row.chunkIndex,
          pageStart: row.pageStart,
          pageEnd: row.pageEnd,
          sectionTitle: row.sectionTitle,
          tokenCount: row.tokenCount,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        },
        score
      };
    });

    // Filter out chunks with no embedding or negative similarity, sort and take topK
    return results
      .filter((r: any) => r.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);
  }
}
