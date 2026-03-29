import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SettingsActions from "@/components/settings-actions";
import { TIER_LABELS } from "@/lib/subscription";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { companies: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 6px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Account settings
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", margin: 0 }}>
          Manage your subscription and account
        </p>
      </div>

      {/* Account info */}
      <div
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderRadius: "12px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 20px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Profile
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 4px 0",
              }}
            >
              Name
            </p>
            <p style={{ fontSize: "15px", color: "var(--color-text-primary)", margin: 0, fontWeight: 500 }}>
              {user.name}
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 4px 0",
              }}
            >
              Email
            </p>
            <p style={{ fontSize: "15px", color: "var(--color-text-primary)", margin: 0, fontWeight: 500 }}>
              {user.email}
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 4px 0",
              }}
            >
              Subscription
            </p>
            <p style={{ fontSize: "15px", color: "var(--color-text-primary)", margin: 0, fontWeight: 500 }}>
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
        companies={user.companies.map((c) => ({ id: c.id, name: c.companyName }))}
      />
    </div>
  );
}
