/**
 * SearchTool — Nexus web search via Tavily API.
 *
 * SECURITY:
 * - NEXUS_SEARCH_API_KEY is server-only (never sent to browser).
 * - External content is treated as untrusted text (never executed/rendered as HTML).
 * - Raw upstream errors are normalized — never exposed to the user.
 */

import type {
  Tool,
  ToolContext,
  ToolResult,
  SearchRequest,
  SearchResult,
  SearchResponse,
  ToolErrorType,
} from "../types";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const DEFAULT_MAX_RESULTS = 5;

export class SearchTool implements Tool {
  id = "web-search";
  name = "Web Search";
  description = "Search the web for current information and return normalized results.";

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const apiKey = process.env.NEXUS_SEARCH_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "Web search is not configured.",
        errorType: "TOOL_UNAVAILABLE",
      };
    }

    const searchReq = input as SearchRequest;
    if (!searchReq?.query || typeof searchReq.query !== "string") {
      return {
        success: false,
        error: "Invalid search request.",
        errorType: "TOOL_INVALID_RESPONSE",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    // Chain with the request's abort signal if available
    if (context.abortSignal) {
      context.abortSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const response = await fetch(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: searchReq.query,
          max_results: searchReq.maxResults || DEFAULT_MAX_RESULTS,
          include_answer: false,
          include_raw_content: false,
          search_depth: "basic",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorType = mapHttpError(response.status);
        return {
          success: false,
          error: `Search failed.`,
          errorType,
        };
      }

      const data = await response.json();

      // Normalize Tavily results to our SearchResult format
      const results: SearchResult[] = (data.results || []).map(
        (r: any): SearchResult => ({
          title: sanitizeText(r.title || ""),
          url: r.url || "",
          snippet: sanitizeText(r.content || ""),
          source: extractDomain(r.url || ""),
          publishedAt: r.published_date || undefined,
        })
      );

      const searchResponse: SearchResponse = {
        query: searchReq.query,
        results,
      };

      return {
        success: true,
        data: searchResponse,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error?.name === "AbortError") {
        // Check if it was user cancellation vs timeout
        if (context.abortSignal?.aborted) {
          return {
            success: false,
            error: "Search cancelled.",
            errorType: "TOOL_UNKNOWN",
          };
        }
        return {
          success: false,
          error: "Search timed out.",
          errorType: "TOOL_TIMEOUT",
        };
      }

      return {
        success: false,
        error: "Search failed unexpectedly.",
        errorType: "TOOL_UNKNOWN",
      };
    }
  }
}

function mapHttpError(status: number): ToolErrorType {
  if (status === 401 || status === 403) return "TOOL_AUTH_FAILURE";
  if (status === 429) return "TOOL_RATE_LIMITED";
  if (status >= 500) return "TOOL_UNAVAILABLE";
  return "TOOL_INVALID_RESPONSE";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

/**
 * Strip potentially dangerous content from search snippets.
 * Treat all external text as untrusted.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[<>&"']/g, (c) => {
      const map: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#x27;",
      };
      return map[c] || c;
    })
    .slice(0, 1000); // Cap length
}
