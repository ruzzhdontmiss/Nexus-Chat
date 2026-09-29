import { Retriever } from "../types";

export interface EvalTestCase {
  question: string;
  expectedAnswer?: string;
  expectedSourceChunks?: string[];
}

export class RAGEvaluator {
  constructor(private retriever: Retriever) {}

  async evaluateRetrieval(testCases: EvalTestCase[], filter?: Record<string, any>) {
    const results = [];
    let totalHitRate = 0;
    
    for (const testCase of testCases) {
      const context = await this.retriever.retrieve(testCase.question, filter);
      
      let hit = false;
      const retrievedIds = context.results.map(r => r.chunk.id);
      
      if (testCase.expectedSourceChunks) {
        for (const expectedId of testCase.expectedSourceChunks) {
          if (retrievedIds.includes(expectedId)) {
            hit = true;
            break;
          }
        }
      }
      
      if (hit) totalHitRate++;
      
      results.push({
        question: testCase.question,
        hit,
        diagnostics: context.diagnostics
      });
    }

    return {
      hitRate: totalHitRate / testCases.length,
      details: results
    };
  }
}
