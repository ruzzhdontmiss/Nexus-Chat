/**
 * User entitlements stub.
 *
 * This module provides the foundation for Nexus subscription tiers.
 * For now it returns development defaults. Stripe integration is a future ticket.
 */

export type NexusTier = "free" | "pro" | "team";

export type UserEntitlements = {
  tier: NexusTier;
  freeModelsEnabled: boolean;
  byokEnabled: boolean;
  maxConnections: number;
  searchEnabled: boolean;
  dailySearchLimit: number;
};

/**
 * Returns the current entitlements for a user.
 * In the future this will query the subscription system.
 * For now every user gets development defaults.
 */
export async function getUserEntitlements(_userId: string): Promise<UserEntitlements> {
  return {
    tier: "free",
    freeModelsEnabled: true,
    byokEnabled: true,
    maxConnections: 10,
    searchEnabled: process.env.NEXUS_SEARCH_ENABLED !== "false",
    dailySearchLimit: parseInt(process.env.NEXUS_DAILY_SEARCH_LIMIT || "50", 10),
  };
}
