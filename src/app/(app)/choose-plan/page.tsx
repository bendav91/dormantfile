import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import PlanPicker from "@/components/plan-picker";
import { TIER_LABELS } from "@/lib/subscription";
import { isFilingLive } from "@/lib/launch-mode";

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

  if (!isFilingLive()) {
    redirect("/dashboard");
  }

  const isUpgrade =
    user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling";

  return (
    <div className="max-w-[960px] mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          {isUpgrade ? "Change your plan" : "Choose your plan"}
        </h1>
        <p className="text-base text-secondary m-0">
          {isUpgrade
            ? `You're currently on the ${TIER_LABELS[user.subscriptionTier]} plan. Select a new plan below.`
            : "Select a plan to get started with DormantFile."}
        </p>
      </div>

      <PlanPicker
        currentTier={user.subscriptionTier}
        isUpgrade={isUpgrade}
        disabled={!isFilingLive()}
      />
    </div>
  );
}
