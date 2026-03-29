import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling")) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const { success } = rateLimit(`resync:${session.user.id}`, 5, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { companyId } = body;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  // Verify company belongs to user
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const result = await resyncFromCompaniesHouse(companyId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ newFilingsCount: result.newFilingsCount });
}
