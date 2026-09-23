import { NextRequest, NextResponse } from "next/server";
import { getConversationWithMessages } from "@/lib/db/conversations";
import { requireUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const conversation = await getConversationWithMessages(user.id, id);
    
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(`[API GET Conversation ${params}]`, error);
    return NextResponse.json({ error: "Failed to retrieve conversation" }, { status: 500 });
  }
}
