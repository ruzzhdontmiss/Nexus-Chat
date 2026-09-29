import { ContextCompressor, RetrievalResult } from "../types";

export class SimpleContextCompressor implements ContextCompressor {
  constructor(private maxTokens: number = 3000) {}

  async compress(query: string, context: RetrievalResult[]): Promise<RetrievalResult[]> {
    // A production neural compressor (e.g. LLMLingua) would extract sub-sentences.
    // For this implementation, we ensure token limits and remove obvious duplicates 
    // while STRICTLY preserving chunk provenance.
    
    const compressed: RetrievalResult[] = [];
    let currentTokens = 0;
    const seenContent = new Set<string>();

    for (const result of context) {
      // Basic deduplication
      if (seenContent.has(result.chunk.content)) {
        continue;
      }
      
      const tokens = result.chunk.tokenCount || Math.ceil(result.chunk.content.length / 4);
      
      if (currentTokens + tokens > this.maxTokens) {
        // Hard limit reached.
        break;
      }
      
      seenContent.add(result.chunk.content);
      currentTokens += tokens;
      compressed.push(result);
    }
    
    return compressed;
  }
}
