import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import FilingFlow from "./filing-flow";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CT600FilingPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.subscriptionStatus !== "active") redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) redirect("/dashboard");
  if (!company.registeredForCorpTax) redirect(`/file/${companyId}`);

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <FilingFlow
        companyId={company.id}
        companyName={company.companyName}
        uniqueTaxReference={company.uniqueTaxReference!}
        declarantName={user.name}
        periodStart={formatDate(company.accountingPeriodStart)}
        periodEnd={formatDate(company.accountingPeriodEnd)}
      />
    </div>
  );
}
