"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { dismissOnboarding } from "@/lib/onboarding-actions";
import type { OnboardingState } from "@/lib/onboarding";

export default function OnboardingChecklist({ state }: { state: OnboardingState }) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;
  if (!state.visible && !state.complete) return null;

  if (state.complete) {
    return (
      <section className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-foreground mb-1.5">You&apos;re set</h2>
        <p className="text-[15px] text-secondary leading-normal m-0">
          Your first return is in. Your other return — Accounts or CT600 — is on your
          company page whenever you&apos;re ready.
        </p>
      </section>
    );
  }

  function handleDismiss() {
    setHidden(true);
    startTransition(() => {
      void dismissOnboarding();
    });
  }

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            Get your first filing done
          </h2>
          <p className="text-sm text-secondary m-0 leading-normal">
            Three quick steps. We handle the submission to HMRC and Companies House.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-muted hover:text-secondary transition-colors shrink-0"
        >
          Hide this
        </button>
      </div>

      <ol role="list" className="flex flex-col gap-3 m-0 p-0 list-none">
        {state.steps.map((step, i) => {
          const isActive = state.activeStepKey === step.key;
          const note = step.locked ? step.lockedNote : step.subLabel;
          return (
            <li
              key={step.key}
              className="flex items-center gap-4 motion-safe:[animation:onboarding-step-in_320ms_cubic-bezier(0.22,1,0.36,1)_both]"
              data-delay={i}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                  step.done
                    ? "bg-primary-bg text-primary"
                    : step.locked
                      ? "bg-inset text-muted"
                      : isActive
                        ? "bg-primary text-card"
                        : "bg-inset text-secondary",
                )}
              >
                {step.done ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : step.locked ? (
                  <Lock size={13} strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[15px] font-semibold m-0",
                    step.done ? "text-secondary" : "text-foreground",
                  )}
                >
                  {step.label}
                </p>
                {note && (
                  <p className="text-[13px] text-muted m-0 mt-0.5 leading-normal">{note}</p>
                )}
              </div>

              {isActive && !step.locked && (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1.5 bg-primary text-card py-2 px-4 rounded-lg font-semibold text-sm no-underline shrink-0"
                >
                  Continue
                  <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
              )}
              {!isActive && !step.done && !step.locked && (
                <Link
                  href={step.href}
                  className="text-sm font-semibold text-primary no-underline shrink-0"
                >
                  Open
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
