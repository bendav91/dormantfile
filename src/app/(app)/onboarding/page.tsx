import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import CompanyForm from "@/components/company-form";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { canAddCompany } from "@/lib/subscription";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  const activeCompanyCount = await prisma.company.count({
    where: { userId: session.user.id, deletedAt: null },
  });

  const hasCompanies = activeCompanyCount > 0;
  const hasSubscription = user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling";
  const isFirstCompany = !hasCompanies && !hasSubscription;

  // If they already have companies but can't add more, send them back
  if (hasCompanies && !canAddCompany(user.subscriptionTier, activeCompanyCount)) {
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      {(hasCompanies || hasSubscription) && (
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            marginBottom: "20px",
          }}
        >
          &larr; Back to dashboard
        </Link>
      )}

      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
          }}
        >
          {hasCompanies ? "Add another company" : "Add your company"}
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--color-text-body)",
            margin: 0,
            lineHeight: "1.6",
          }}
        >
          Enter your company details below. We use this information to prepare and file your annual accounts and Corporation Tax returns on time, every year.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "14px 16px",
          backgroundColor: "var(--color-primary-bg)",
          border: "1px solid var(--color-primary-border)",
          borderRadius: "8px",
          marginBottom: "28px",
        }}
      >
        <span style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "1px", display: "flex" }}>
          <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
        </span>
        <p style={{ fontSize: "14px", color: "var(--color-primary-text)", margin: 0, lineHeight: "1.5" }}>
          Your data is protected with industry-standard encryption. We only use these details to file your accounts and tax returns.
        </p>
      </div>

      <CompanyForm isFirstCompany={isFirstCompany} />
    </div>
  );
}
