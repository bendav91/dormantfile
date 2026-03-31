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
  const hasSubscription =
    user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling";
  const isFirstCompany = !hasCompanies && !hasSubscription;

  // If they already have companies but can't add more, send them back
  if (hasCompanies && !canAddCompany(user.subscriptionTier, activeCompanyCount)) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-[960px] mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-secondary no-underline mb-5"
      >
        &larr; Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-foreground mb-3 tracking-[-0.02em]">
          {hasCompanies ? "Add another company" : "Add your company"}
        </h1>
        <p className="text-base text-body m-0 leading-relaxed">
          Enter your company details below. We use this information to prepare and file your annual
          accounts and Corporation Tax returns on time, every year.
        </p>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3.5 bg-primary-bg border border-primary-border rounded-lg mb-7">
        <span className="text-primary shrink-0 mt-px flex">
          <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
        </span>
        <p className="text-sm text-primary-text m-0 leading-normal">
          Your data is protected with industry-standard encryption. We only use these details to
          file your accounts and tax returns.
        </p>
      </div>

      <CompanyForm isFirstCompany={isFirstCompany} />
    </div>
  );
}
