import { db } from "@/prisma/db";
import { NEXUS_FREE_LIMITS, RateLimitError } from "./limits";

export type UsageEventKind = "chat_request" | "search_request";
export type UsageStatus = "success" | "error" | "rate_limited" | "cancelled" | "rejected" | "pending";

export interface TokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

const CHAT_RATE_LIMIT = parseInt(process.env.NEXUS_CHAT_RATE_LIMIT_PER_MINUTE || "20", 10);
const SEARCH_RATE_LIMIT = parseInt(process.env.NEXUS_SEARCH_RATE_LIMIT_PER_MINUTE || "10", 10);
const DAILY_SEARCH_LIMIT = parseInt(process.env.NEXUS_DAILY_SEARCH_LIMIT || "50", 10);

export async function checkRateLimit(userId: string, endpoint: "chat" | "search"): Promise<void> {
  const limit = endpoint === "chat" ? CHAT_RATE_LIMIT : SEARCH_RATE_LIMIT;
  
  const now = new Date();
  now.setUTCSeconds(0, 0);
  const windowStart = now.toISOString();

  // Atomically increment rate limit using raw SQL for UPSERT functionality
  const plan = db.raw.sql`
    INSERT INTO "rateLimit" ("id", "userId", "endpoint", "windowStart", "count")
    VALUES (gen_random_uuid(), ${userId}, ${endpoint}, ${windowStart}, 1)
    ON CONFLICT ("userId", "endpoint", "windowStart")
    DO UPDATE SET "count" = "rateLimit"."count" + 1
    RETURNING "count"
  `.returnsRow({ count: 'pg/int4@1' }).build();
  
  const result = await db.runtime().query(plan);
  const count = (result as any[])[0]?.count || 1;

  if (count > limit) {
    throw new RateLimitError(`Rate limit exceeded for ${endpoint}`);
  }
}

export async function checkUsageLimit(userId: string, type: "chat" | "search", accessType?: string): Promise<{ allowed: boolean, reason?: string, remaining?: number }> {
  const today = new Date();
  today.setUTCHours(0,0,0,0);
  const dateStr = today.toISOString().split('T')[0];

  const plan = db.raw.sql`
    INSERT INTO "usageQuota" ("id", "userId", "date", "chatRequests", "searchRequests", "tokens", "updatedAt")
    VALUES (gen_random_uuid(), ${userId}, ${dateStr}, 0, 0, 0, now())
    ON CONFLICT ("userId", "date") DO NOTHING
  `.affectedCount().build();
  await db.runtime().execute(plan);

  const current = await db.orm.public.UsageQuota.where({ userId, date: dateStr }).first();
  if (!current) {
    return { allowed: true };
  }

  if (type === "search") {
    if (current.searchRequests >= DAILY_SEARCH_LIMIT) {
      return { allowed: false, reason: "SEARCH_LIMIT_REACHED", remaining: 0 };
    }
  }

  if (type === "chat" && accessType === "managed") {
    if (!NEXUS_FREE_LIMITS.enabled) {
       return { allowed: false, reason: "FEATURE_DISABLED" };
    }
    if (current.chatRequests >= NEXUS_FREE_LIMITS.dailyRequests) {
      return { allowed: false, reason: "DAILY_REQUEST_LIMIT", remaining: 0 };
    }
    if (current.tokens >= NEXUS_FREE_LIMITS.dailyTokens) {
      return { allowed: false, reason: "DAILY_TOKEN_LIMIT", remaining: 0 };
    }
  }

  return { allowed: true };
}

export async function recordSearchUsage(data: {
  userId: string;
  requestId: string;
  conversationId: string;
  durationMs: number;
  status: UsageStatus;
}): Promise<void> {
  await db.orm.public.UsageEvent.create({
    kind: "search_request",
    userId: data.userId,
    requestId: data.requestId,
    conversationId: data.conversationId,
    durationMs: data.durationMs,
    status: data.status,
  });

  if (data.status === "success") {
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const dateStr = today.toISOString().split('T')[0];
    
    const plan = db.raw.sql`
      UPDATE "usageQuota" 
      SET "searchRequests" = "searchRequests" + 1 
      WHERE "userId" = ${data.userId} AND "date" = ${dateStr}
    `.affectedCount().build();
    await db.runtime().execute(plan);
  }
}

export async function recordChatUsage(data: {
  userId: string;
  requestId: string;
  conversationId: string;
  providerId: string;
  modelId: string;
  accessType: string;
  tokens: TokenUsage;
  durationMs: number;
  status: UsageStatus;
}): Promise<void> {
  await db.orm.public.UsageEvent.create({
    kind: "chat_request",
    userId: data.userId,
    requestId: data.requestId,
    conversationId: data.conversationId,
    providerId: data.providerId,
    modelId: data.modelId,
    accessType: data.accessType,
    inputTokens: data.tokens.inputTokens,
    outputTokens: data.tokens.outputTokens,
    totalTokens: data.tokens.totalTokens,
    durationMs: data.durationMs,
    status: data.status,
  });

  if (data.status === "success" && data.accessType === "managed") {
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const dateStr = today.toISOString().split('T')[0];
    
    const totalTokens = data.tokens.totalTokens || 0;

    const plan = db.raw.sql`
      UPDATE "usageQuota" 
      SET "chatRequests" = "chatRequests" + 1, "tokens" = "tokens" + ${totalTokens}
      WHERE "userId" = ${data.userId} AND "date" = ${dateStr}
    `.affectedCount().build();
    await db.runtime().execute(plan);
  }
}

export async function getUserUsageStats(userId: string) {
  const today = new Date();
  today.setUTCHours(0,0,0,0);
  const dateStr = today.toISOString().split('T')[0];

  let current = await db.orm.public.UsageQuota.where({ userId, date: dateStr }).first();
  if (!current) {
    current = { chatRequests: 0, searchRequests: 0, tokens: 0 } as any;
  }

  return {
    chat: {
      requestsToday: current!.chatRequests,
      requestLimit: NEXUS_FREE_LIMITS.dailyRequests,
      tokensToday: current!.tokens,
      tokenLimit: NEXUS_FREE_LIMITS.dailyTokens
    },
    search: {
      requestsToday: current!.searchRequests,
      requestLimit: DAILY_SEARCH_LIMIT
    }
  };
}
