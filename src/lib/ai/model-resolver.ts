/**
 * ModelResolver — server-only module.
 *
 * Resolves a (userId, modelId) pair to a fully-populated ModelInfo
 * plus the decrypted credential key (if required).
 *
 * SECURITY CONTRACT:
 * - credentialKey is NEVER returned to the browser.
 * - userId is ALWAYS derived from the authenticated session — never trusted from the client.
 * - Managed credentials come from process.env only (never from DB for managed models).
 * - BYOK credentials are decrypted from the user's ProviderConnection in the DB.
 */

import { ModelInfo, ProviderError } from "./types";
import { modelRegistry } from "./registry";
import { db } from "@/prisma/db";
import { decrypt } from "@/lib/crypto/credentials";

export type ResolvedModel = {
  modelInfo: ModelInfo;
  providerId: string;
  credentialKey: string | undefined;
  source: "managed" | "byok";
};

/** Map of provider ID → env var name for Nexus-managed keys */
const MANAGED_ENV_KEYS: Record<string, string> = {
  mistral: "MISTRAL_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
};

export async function resolveModel(userId: string, modelId: string): Promise<ResolvedModel> {
  let modelInfo: ModelInfo;

  try {
    modelInfo = modelRegistry.get(modelId);
  } catch {
    throw new ProviderError("unsupported_model", `Model "${modelId}" is not available.`);
  }

  const providerId = modelInfo.provider;
  const source = modelInfo.source ?? (modelInfo.access === "managed" ? "managed" : "byok");

  if (source === "managed") {
    // Use Nexus-owned env key — never touches DB
    const envKey = MANAGED_ENV_KEYS[providerId];
    const credentialKey = envKey ? process.env[envKey] || undefined : undefined;

    if (!credentialKey && providerId !== "mock") {
      throw new ProviderError(
        "auth_failure",
        `${providerId} is not configured. Contact support.`
      );
    }

    return { modelInfo, providerId, credentialKey, source: "managed" };
  }

  // BYOK: fetch user's ProviderConnection from DB
  const connection = await db.orm.public.ProviderConnection
    .where({ userId, providerId })
    .first();

  if (!connection) {
    throw new ProviderError(
      "auth_failure",
      `No ${providerId} API key connected. Go to Settings → AI Providers to connect one.`
    );
  }

  let credentialKey: string;
  try {
    credentialKey = decrypt(connection.encryptedCredential);
  } catch {
    // Don't leak decryption details
    throw new ProviderError(
      "auth_failure",
      "Failed to retrieve your API key. Please reconnect your provider."
    );
  }

  return { modelInfo, providerId, credentialKey, source: "byok" };
}
