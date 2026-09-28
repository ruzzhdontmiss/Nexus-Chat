/**
 * Builds a grounded context block from normalized search results.
 *
 * This text is prepended to the model's message history as a system-level
 * context. The model is instructed to ground responses in these results
 * and not fabricate sources.
 */

import type { SearchResponse, SourceReference } from "../types";

/**
 * Build a system prompt context block from search results.
 */
export function buildGroundingContext(search: SearchResponse): string {
  if (!search.results.length) {
    return "No relevant web search results were found for this query. Answer based on your training knowledge only, and clearly state that no web sources were available.";
  }

  const resultBlocks = search.results
    .map((r, i) => {
      let block = `Source ${i + 1}\nTitle: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`;
      if (r.publishedAt) block += `\nPublished: ${r.publishedAt}`;
      return block;
    })
    .join("\n\n");

  return `The following are recent web search results for the user's query. Use them to provide an accurate, grounded response.

IMPORTANT INSTRUCTIONS:
- Ground your factual claims in the provided search results.
- Do NOT fabricate sources, URLs, or facts not present in the results.
- If information from the results is uncertain or incomplete, say so.
- Distinguish between source-supported information and your own reasoning.
- Reference sources naturally (e.g. "According to..." or "Based on...").

WEB SEARCH RESULTS

${resultBlocks}`;
}

/**
 * Extract SourceReference metadata from search results for frontend rendering.
 */
export function extractSources(search: SearchResponse): SourceReference[] {
  return search.results.map((r, i) => ({
    id: `src-${i}`,
    title: r.title,
    url: r.url,
    domain: r.source,
  }));
}
