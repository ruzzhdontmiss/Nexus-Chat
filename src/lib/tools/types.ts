/**
 * Generic Tool contract for the Nexus tool execution layer.
 *
 * This is the foundation for all tool capabilities (search, code exec, etc.)
 * Each tool implements this interface and is registered in the tool registry.
 */

export interface ToolContext {
  userId: string;
  conversationId?: string;
  abortSignal?: AbortSignal;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  errorType?: ToolErrorType;
}

export type ToolErrorType =
  | "TOOL_UNAVAILABLE"
  | "TOOL_TIMEOUT"
  | "TOOL_RATE_LIMITED"
  | "TOOL_INVALID_RESPONSE"
  | "TOOL_AUTH_FAILURE"
  | "TOOL_UNKNOWN";

export interface Tool {
  id: string;
  name: string;
  description: string;

  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

// ── Search-specific normalized types ──────────────────────────

export interface SearchRequest {
  query: string;
  maxResults?: number;
  recencyDays?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedAt?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface SourceReference {
  id: string;
  title: string;
  url: string;
  domain?: string;
}
