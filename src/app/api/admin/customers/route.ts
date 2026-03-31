import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getCustomerList } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;

  const result = await getCustomerList({
    q: searchParams.get("q") || undefined,
    filter: searchParams.get("filter") || undefined,
    page: Number(searchParams.get("page")) || 1,
  });

  return NextResponse.json(result);
}
