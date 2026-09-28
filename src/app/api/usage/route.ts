import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserUsageStats } from "@/lib/usage/service";

export async function GET() {
  try {
    const user = await requireUser();
    const stats = await getUserUsageStats(user.id);
    return NextResponse.json(stats);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to get usage stats" }, { status: 500 });
  }
}
