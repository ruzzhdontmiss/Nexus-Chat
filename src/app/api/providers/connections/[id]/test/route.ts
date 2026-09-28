import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/prisma/db";
import { decrypt } from "@/lib/crypto/credentials";
import { getProvider } from "@/lib/ai/provider-registry";

/**
 * POST /api/providers/connections/:id/test
 * Tests a provider connection by decrypting the credential and making
 * a lightweight authenticated request to the provider.
 *
 * Returns { ok: true } or { ok: false, message: "..." }
 * Never exposes raw provider errors or credentials.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verify ownership
    const connection = await db.orm.public.ProviderConnection
      .where({ id, userId: user.id })
      .first();

    if (!connection) {
      return Response.json({ ok: false, message: "Connection not found." }, { status: 404 });
    }

    const providerDef = getProvider(connection.providerId);
    if (!providerDef) {
      return Response.json({ ok: false, message: "Provider is no longer supported." });
    }

    let apiKey: string;
    try {
      apiKey = decrypt(connection.encryptedCredential);
    } catch {
      return Response.json({ ok: false, message: "Failed to decrypt credential. Please reconnect." });
    }

    // Lightweight test: try to list models or make a minimal request
    const testResult = await testProviderConnection(connection.providerId, apiKey);
    return Response.json(testResult);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ ok: false, message: "Connection test failed." }, { status: 500 });
  }
}

/**
 * Tests a provider connection with a lightweight API call.
 * Each provider has a different way to verify credentials.
 */
async function testProviderConnection(
  providerId: string,
  apiKey: string
): Promise<{ ok: boolean; message: string }> {
  try {
    switch (providerId) {
      case "openrouter": {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { ok: true, message: "Connected to OpenRouter." };
        if (res.status === 401) return { ok: false, message: "Invalid OpenRouter API key." };
        return { ok: false, message: "OpenRouter returned an error." };
      }

      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { ok: true, message: "Connected to OpenAI." };
        if (res.status === 401) return { ok: false, message: "Invalid OpenAI API key." };
        return { ok: false, message: "OpenAI returned an error." };
      }

      case "mistral": {
        const res = await fetch("https://api.mistral.ai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { ok: true, message: "Connected to Mistral." };
        if (res.status === 401) return { ok: false, message: "Invalid Mistral API key." };
        return { ok: false, message: "Mistral returned an error." };
      }

      case "moonshot": {
        const res = await fetch("https://api.moonshot.cn/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { ok: true, message: "Connected to Moonshot / Kimi." };
        if (res.status === 401) return { ok: false, message: "Invalid Moonshot API key." };
        return { ok: false, message: "Moonshot returned an error." };
      }

      case "glm": {
        const res = await fetch("https://api.z.ai/api/paas/v4/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { ok: true, message: "Connected to Z.AI / GLM." };
        if (res.status === 401) return { ok: false, message: "Invalid Z.AI API key." };
        return { ok: false, message: "Z.AI returned an error." };
      }

      case "anthropic": {
        // Anthropic uses x-api-key header, not Bearer
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        });
        if (res.ok) return { ok: true, message: "Connected to Anthropic." };
        if (res.status === 401) return { ok: false, message: "Invalid Anthropic API key." };
        return { ok: false, message: "Anthropic returned an error." };
      }

      default:
        return { ok: false, message: `Connection test not available for ${providerId}.` };
    }
  } catch {
    return { ok: false, message: "Network error — could not reach the provider." };
  }
}
