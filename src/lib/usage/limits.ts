

// Limits configuration (all values are server-side only via env vars)
export const NEXUS_FREE_LIMITS = {
  get enabled() { return process.env.NEXUS_FREE_ENABLED === "true"; },
  get dailyRequests() { return parseInt(process.env.NEXUS_FREE_DAILY_REQUEST_LIMIT || "20", 10); },
  get dailyTokens() { return parseInt(process.env.NEXUS_FREE_DAILY_TOKEN_LIMIT || "100000", 10); },
  get maxOutputTokens() { return parseInt(process.env.NEXUS_FREE_MAX_OUTPUT_TOKENS || "2000", 10); },
  get maxContextTokens() { return parseInt(process.env.NEXUS_FREE_MAX_CONTEXT_TOKENS || "8000", 10); },
};

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

