import { NextRequest, NextResponse } from "next/server";
import { listConversations, createConversation } from "@/lib/db/conversations";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const conversations = await listConversations(user.id);
    return NextResponse.json({ conversations });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[API GET Conversations]", error);
    return NextResponse.json({ error: "Failed to list conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const conversation = await createConversation(user.id, body.title);
    return NextResponse.json({ conversation });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[API POST Conversations]", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
