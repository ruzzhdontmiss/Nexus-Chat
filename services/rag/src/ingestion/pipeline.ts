import { getDocumentProxy, extractText } from "unpdf";
import { db } from "../db/client";
import { ContextAwareChunker } from "./chunker";
import { BGEEmbeddingProvider } from "../embeddings/bge-provider";
import { PrismaVectorStore } from "../retrieval/vector-store";
import { DocumentChunk } from "@nexus/rag-contracts";

export class IngestionPipeline {
  private chunker = new ContextAwareChunker();
  private embeddingProvider = new BGEEmbeddingProvider();
  private vectorStore = new PrismaVectorStore();

  async processPdfBuffer(userId: string, filename: string, buffer: Buffer): Promise<string> {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(uint8Array);
    const textResult = await extractText(pdf);

    let unifiedText = "";
    for (let i = 0; i < textResult.totalPages; i++) {
        unifiedText += `\n---PAGE_START_${i + 1}---\n${textResult.text[i]}\n---PAGE_END_${i + 1}---\n`;
    }

    return this.processPdfText(userId, filename, unifiedText, buffer.length);
  }

  async processPdfText(userId: string, filename: string, text: string, originalSize: number): Promise<string> {
    const doc = await db.orm.public.Document.create({
      userId,
      filename,
      mimeType: "application/pdf",
      size: originalSize,
      status: "processing"
    });

    try {
      // 3. Chunk
      const rawChunks = this.chunker.chunkText(text);

      // 4. Embed in batches
      const chunks: DocumentChunk[] = [];
      const embeddings: number[][] = [];
      const textsToEmbed: string[] = [];

      for (const rc of rawChunks) {
        const id = crypto.randomUUID();
        chunks.push({
          id,
          documentId: doc.id,
          content: rc.content,
          chunkIndex: rc.chunkIndex,
          sectionTitle: rc.sectionTitle,
          pageStart: rc.pageStart,
          tokenCount: Math.ceil(rc.content.length / 4), // rough estimate
          metadata: { filename }
        });
        textsToEmbed.push(rc.content);
      }

      // Batch embedding (BGE provider handles array of strings)
      const batchEmbeddings = await this.embeddingProvider.embedBatch(textsToEmbed);

      // 5. Index in Vector Store (also persists to DB)
      await this.vectorStore.add(chunks, batchEmbeddings);

      // 6. Update Status
      await db.orm.public.Document
        .where({ id: doc.id })
        .update({ status: "ready" });

      return doc.id;
    } catch (error) {
      await db.orm.public.Document
        .where({ id: doc.id })
        .update({ 
          status: "failed", 
          metadata: JSON.stringify({ error: (error as Error).message }) 
        });
      throw error;
    }
  }
}
