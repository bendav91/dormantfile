import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SettingsActions from "@/components/settings-actions";
import ProfileForm from "@/components/profile-form";

import { TIER_LABELS } from "@/lib/subscription";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reminders?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      companies: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      pendingEmailChange: { select: { newEmail: true, expiresAt: true } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-[960px] mx-auto">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-foreground mb-1.5 tracking-[-0.02em]">
          Account settings
        </h1>
        <p className="text-[15px] text-secondary">
          Manage your subscription and account
        </p>
      </div>

      {/* Account info */}
      <div className="bg-card rounded-xl p-7 shadow-md mb-6">
        <h2 className="text-[17px] font-bold text-foreground mb-5 tracking-[-0.01em]">
          Profile
        </h2>
        <div className="flex flex-col gap-4">
          <ProfileForm
            name={user.name}
            email={user.email}
            pendingEmail={
              user.pendingEmailChange && user.pendingEmailChange.expiresAt > new Date()
                ? user.pendingEmailChange.newEmail
                : null
            }
          />
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-[0.05em] mb-1">
              Subscription
            </p>
            <p className="text-[15px] text-foreground font-medium">
              {user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling"
                ? `Active - ${TIER_LABELS[user.subscriptionTier]} plan`
                : user.subscriptionStatus === "past_due"
                  ? "Past due"
                  : user.subscriptionStatus === "cancelled"
                    ? "Cancelled"
                    : "None"}
            </p>
          </div>
        </div>
      </div>

      <SettingsActions
        hasSubscription={user.subscriptionStatus !== "none"}
        hasStripeCustomer={!!user.stripeCustomerId}
        isAgentTier={user.subscriptionTier === "agent"}
        filingAsAgent={user.filingAsAgent}
        remindersMuted={user.remindersMuted}
        showMutedSuccess={params.reminders === "muted"}
        companies={user.companies.map((c) => ({ id: c.id, name: c.companyName }))}
      />

    </div>
  );
}
