import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import PlanPicker from "@/components/plan-picker";
import { TIER_LABELS } from "@/lib/subscription";

export default async function ChoosePlanPage() {
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

  const isUpgrade = user.subscriptionStatus === "active";

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1E293B",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          {isUpgrade ? "Change your plan" : "Choose your plan"}
        </h1>
        <p style={{ fontSize: "16px", color: "#64748B", margin: 0 }}>
          {isUpgrade
            ? `You're currently on the ${TIER_LABELS[user.subscriptionTier]} plan. Select a new plan below.`
            : "Select a plan to get started with DormantFile."}
        </p>
      </div>

      <PlanPicker currentTier={user.subscriptionTier} isUpgrade={isUpgrade} />
    </div>
  );
}
