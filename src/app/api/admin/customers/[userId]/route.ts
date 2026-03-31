import { NextResponse } from "next/server";
import { requireAdmin, getCustomerDetail } from "@/lib/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const user = await getCustomerDetail(userId);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
