import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@nexus/database";

/**
 * DELETE /api/providers/connections/:id
 * Deletes a provider connection owned by the authenticated user.
 * The encrypted credential is permanently destroyed.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verify ownership — only delete if this connection belongs to the authenticated user
    const connection = await db.orm.public.ProviderConnection
      .where({ id, userId: user.id })
      .first();

    if (!connection) {
      return Response.json({ error: "Connection not found." }, { status: 404 });
    }

    await db.orm.public.ProviderConnection
      .where({ id })
      .delete();

    return Response.json({ deleted: true });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Failed to delete connection" }, { status: 500 });
  }
}
