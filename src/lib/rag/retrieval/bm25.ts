import { DocumentChunk, LexicalRetriever, RetrievalResult } from "../types";
import { db } from "@/prisma/db";

// Simple tokenizer
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\w+/g) || [];
}

export class BM25Retriever implements LexicalRetriever {
  private k1 = 1.2;
  private b = 0.75;

  async index(chunks: DocumentChunk[]): Promise<void> {
    // For this prototype, we're not persisting a discrete BM25 index in the DB.
    // We compute it dynamically on the isolated user chunks at retrieval time.
    // In a production system at scale, this would insert into a dedicated BM25 inverted index model or ParadeDB.
  }

  async search(query: string, topK: number, filter?: Record<string, any>): Promise<RetrievalResult[]> {
    const userId = filter?.userId;
    if (!userId) {
      throw new Error("BM25 search requires a userId filter for security isolation");
    }

    const documentId = filter?.documentId;
    let chunks: any[];

    if (documentId) {
      chunks = await db.orm.public.DocumentChunk
        // @ts-ignore
        .include('document')
        .where({ documentId })
        .all();
      // Additional check
      chunks = chunks.filter(c => c.document.userId === userId);
    } else {
      chunks = await db.orm.public.DocumentChunk
        // @ts-ignore
        .include('document')
        .all();
      chunks = chunks.filter(c => c.document.userId === userId);
    }

    if (chunks.length === 0) return [];

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    // Precompute document frequencies
    const docCount = chunks.length;
    const docLengths: number[] = new Array(docCount);
    const termDocFreq: Record<string, number> = {};
    let totalLength = 0;

    const chunkTokens = chunks.map((chunk, i) => {
      const tokens = tokenize(chunk.content);
      docLengths[i] = tokens.length;
      totalLength += tokens.length;

      // Unique terms in this document
      const uniqueTerms = new Set(tokens);
      uniqueTerms.forEach(term => {
        termDocFreq[term] = (termDocFreq[term] || 0) + 1;
      });

      return tokens;
    });

    const avgDocLength = totalLength / docCount;

    // Calculate IDF
    const idf: Record<string, number> = {};
    queryTerms.forEach(term => {
      const df = termDocFreq[term] || 0;
      // standard BM25 IDF
      const idfValue = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
      idf[term] = idfValue;
    });

    // Score documents
    const results: RetrievalResult[] = chunks.map((chunk, i) => {
      const tokens = chunkTokens[i];
      const termFreqs: Record<string, number> = {};
      tokens.forEach(term => {
        termFreqs[term] = (termFreqs[term] || 0) + 1;
      });

      let score = 0;
      queryTerms.forEach(term => {
        if (termFreqs[term]) {
          const tf = termFreqs[term];
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + this.b * (docLengths[i] / avgDocLength));
          score += idf[term] * (numerator / denominator);
        }
      });

      return {
        chunk: {
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          sectionTitle: chunk.sectionTitle,
          tokenCount: chunk.tokenCount,
          metadata: chunk.metadata ? JSON.parse(chunk.metadata) : undefined,
        },
        score
      };
    });

    // Filter and sort
    return results
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
