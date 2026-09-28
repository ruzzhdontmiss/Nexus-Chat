import { NextRequest } from "next/server";
import { getAllProviders } from "@/lib/ai/provider-registry";
import { requireUser } from "@/lib/auth";

/**
 * GET /api/providers
 * Returns the static provider registry — metadata only, no secrets.
 */
export async function GET(_req: NextRequest) {
  try {
    await requireUser();
    const providers = getAllProviders();
    return Response.json({ providers });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Failed to fetch providers" }, { status: 500 });
  }
}
