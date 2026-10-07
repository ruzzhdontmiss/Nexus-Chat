import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@nexus/database";
import { encrypt, maskCredential } from "@/lib/crypto/credentials";
import { getProvider } from "@/lib/ai/provider-registry";

/**
 * GET /api/providers/connections
 * Returns the authenticated user's provider connections — masked keys only, never plaintext.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();
    const connections = await db.orm.public.ProviderConnection
      .where({ userId: user.id })
      .all();

    // Never return encryptedCredential — return masked display instead
    const safeConnections = connections.map((c) => ({
      id: c.id,
      providerId: c.providerId,
      authType: c.authType,
      displayName: c.displayName,
      maskedKey: "••••••••",
      metadata: c.metadata,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return Response.json({ connections: safeConnections });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}

/**
 * POST /api/providers/connections
 * Creates a new provider connection for the authenticated user.
 * Body: { providerId, authType, displayName?, credential }
 *
 * The plaintext credential is encrypted immediately and never stored or returned.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { providerId, authType, displayName, credential } = body;

    if (!providerId || !credential) {
      return Response.json({ error: "providerId and credential are required." }, { status: 400 });
    }

    // Validate provider exists
    const providerDef = getProvider(providerId);
    if (!providerDef) {
      return Response.json({ error: `Provider "${providerId}" is not supported.` }, { status: 400 });
    }

    // Check for existing connection (unique constraint: userId + providerId)
    const existing = await db.orm.public.ProviderConnection
      .where({ userId: user.id, providerId })
      .first();

    if (existing) {
      // Update existing connection with new credential
      await db.orm.public.ProviderConnection
        .where({ id: existing.id })
        .update({
          encryptedCredential: encrypt(credential),
          displayName: displayName || existing.displayName,
          authType: authType || existing.authType,
          updatedAt: new Date().toISOString(),
        });

      return Response.json({
        connection: {
          id: existing.id,
          providerId,
          authType: authType || existing.authType,
          displayName: displayName || existing.displayName,
          maskedKey: maskCredential(credential),
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        },
        updated: true,
      });
    }

    // Create new connection
    const encryptedCredential = encrypt(credential);
    const connection = await db.orm.public.ProviderConnection.create({
      userId: user.id,
      providerId,
      authType: authType || "api_key",
      displayName: displayName || `${providerDef.name} API Key`,
      encryptedCredential,
    });

    return Response.json({
      connection: {
        id: connection.id,
        providerId: connection.providerId,
        authType: connection.authType,
        displayName: connection.displayName,
        maskedKey: maskCredential(credential),
        createdAt: connection.createdAt,
      },
      created: true,
    }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Providers] Connection creation failed:", error);
    return Response.json({ error: "Failed to create connection" }, { status: 500 });
  }
}
