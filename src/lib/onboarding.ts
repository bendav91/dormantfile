import type { SubscriptionStatus } from "@prisma/client";

export type OnboardingStepKey = "company" | "plan" | "file";

export interface OnboardingStep {
  key: OnboardingStepKey;
  label: string;
  subLabel?: string;
  done: boolean;
  locked: boolean;
  lockedNote?: string;
  href: string;
}

export interface OnboardingStateInput {
  companyCount: number;
  subscriptionStatus: SubscriptionStatus;
  hasSubmittedFiling: boolean;
  dismissedAt: Date | null;
  accountsFilingLive: boolean;
  ct600FilingLive: boolean;
  firstCompanyId: string | null;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  activeStepKey: OnboardingStepKey | null;
  complete: boolean;
  visible: boolean;
}

export function getOnboardingState(input: OnboardingStateInput): OnboardingState {
  const {
    companyCount,
    subscriptionStatus,
    hasSubmittedFiling,
    dismissedAt,
    accountsFilingLive,
    ct600FilingLive,
    firstCompanyId,
  } = input;

  const anyPathLive = accountsFilingLive || ct600FilingLive;

  let fileSubLabel: string | undefined;
  if (anyPathLive) {
    if (accountsFilingLive && ct600FilingLive) {
      fileSubLabel = "Accounts or CT600 — whichever's due first.";
    } else if (accountsFilingLive) {
      fileSubLabel = "File your dormant accounts.";
    } else {
      fileSubLabel = "File your CT600.";
    }
  }

  const planLocked = !accountsFilingLive;
  const fileLocked = !anyPathLive;

  const steps: OnboardingStep[] = [
    {
      key: "company",
      label: "Add your company",
      done: companyCount > 0,
      locked: false,
      href: "/onboarding",
    },
    {
      key: "plan",
      label: "Choose your plan",
      done: subscriptionStatus === "active" || subscriptionStatus === "cancelling",
      locked: planLocked,
      lockedNote: planLocked ? "Opens soon — we'll email you." : undefined,
      href: "/choose-plan",
    },
    {
      key: "file",
      label: "File your first return",
      subLabel: fileSubLabel,
      done: hasSubmittedFiling,
      locked: fileLocked,
      lockedNote: fileLocked
        ? "Filing opens soon — we'll email you the moment it does."
        : undefined,
      href: firstCompanyId ? `/company/${firstCompanyId}` : "/dashboard",
    },
  ];

  // `complete` drives the "You're set" confirmation panel. It is only shown
  // when the user hasn't already dismissed onboarding — completing a filing
  // should not resurrect a panel they explicitly hid while still in progress.
  const complete = hasSubmittedFiling && dismissedAt == null;
  const activeStep = steps.find((s) => !s.done && !s.locked);

  return {
    steps,
    activeStepKey: activeStep ? activeStep.key : null,
    complete,
    visible: !hasSubmittedFiling && dismissedAt == null,
  };
}
