import { db } from "@/prisma/db";

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

export async function checkFreeUsage(userId: string): Promise<void> {
  if (!NEXUS_FREE_LIMITS.enabled) {
    throw new RateLimitError("Nexus Free tier is currently disabled.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch today's usage events for this user
  const usageEvents = await db.orm.public.UsageEvent
    .where({ userId })
    .all();

  // Filter in JS to events from today (createdAt is an ISO string)
  const todayStr = today.toISOString();
  const todayEvents = usageEvents.filter((e) => e.createdAt >= todayStr);

  const successfulRequests = todayEvents.filter((e) => e.status === "success").length;
  const totalTokens = todayEvents.reduce((acc, e) => acc + (e.totalTokens || 0), 0);

  if (successfulRequests >= NEXUS_FREE_LIMITS.dailyRequests) {
    throw new RateLimitError(
      `You have reached your daily request limit of ${NEXUS_FREE_LIMITS.dailyRequests}.`
    );
  }

  if (totalTokens >= NEXUS_FREE_LIMITS.dailyTokens) {
    throw new RateLimitError(
      `You have reached your daily token limit of ${NEXUS_FREE_LIMITS.dailyTokens}.`
    );
  }
}

export async function recordFreeUsage(data: {
  userId: string;
  providerId: string;
  modelId: string;
  accessType: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  status: "success" | "error" | "rate_limited";
}): Promise<void> {
  await db.orm.public.UsageEvent.create({
    userId: data.userId,
    providerId: data.providerId,
    modelId: data.modelId,
    accessType: data.accessType,
    inputTokens: data.inputTokens ?? null,
    outputTokens: data.outputTokens ?? null,
    totalTokens: data.totalTokens ?? null,
    status: data.status,
  });
}
