import { NextResponse } from "next/server";
import { requireAdmin, getAttentionCounts, getHealthStats, getRecentActivity } from "@/lib/admin";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [attention, health, activity] = await Promise.all([
    getAttentionCounts(),
    getHealthStats(),
    getRecentActivity(),
  ]);

  return NextResponse.json({ attention, health, activity });
}
