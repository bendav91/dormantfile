import { NextResponse } from "next/server";
import { requireAdmin, getMessagesList } from "@/lib/admin";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await getMessagesList();
  return NextResponse.json({ messages });
}
