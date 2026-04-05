import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminCustomerDetail } from "./AdminCustomerDetail";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Detail — Admin",
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getCustomerDetail(userId);

  if (!user) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/customers"
        className="text-xs mb-4 inline-block text-muted no-underline"
      >
        &larr; Back to customers
      </Link>

      {/* Header */}
      <div className="p-5 rounded-xl mb-6 bg-card border border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {user.name}
            </h2>
            <p className="text-sm text-muted">
              {user.email}
            </p>
            <p className="text-xs mt-1 text-muted">
              Signed up {new Date(user.createdAt).toLocaleDateString("en-GB")}
              {user.remindersMuted && " · Reminders muted"}
              {user.filingAsAgent && " · Agent filing"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={user.subscriptionStatus} />
            {user.subscriptionTier !== "none" && (
              <StatusBadge status={user.subscriptionTier} label={user.subscriptionTier} />
            )}
            {user.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary no-underline"
              >
                Stripe <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Companies + Filings (interactive) */}
      <AdminCustomerDetail
        companies={user.companies.map((c) => ({
          id: c.id,
          companyName: c.companyName,
          crn: c.companyRegistrationNumber,
          isDeleted: !!c.deletedAt,
          filings: c.filings.map((f) => ({
            id: f.id,
            filingType: f.filingType,
            periodStart: f.periodStart.toISOString(),
            periodEnd: f.periodEnd.toISOString(),
            status: f.status,
            deadline: f.deadline?.toISOString() ?? null,
            submittedAt: f.submittedAt?.toISOString() ?? null,
            confirmedAt: f.confirmedAt?.toISOString() ?? null,
            hasCorrelationId: !!f.correlationId,
          })),
        }))}
        review={
          user.review
            ? {
                id: user.review.id,
                rating: user.review.rating,
                name: user.review.name,
                text: user.review.text,
                verified: user.review.verified,
                approved: user.review.approved,
                hiddenAt: user.review.hiddenAt?.toISOString() ?? null,
                createdAt: user.review.createdAt.toISOString(),
              }
            : null
        }
      />
    </div>
  );
}
