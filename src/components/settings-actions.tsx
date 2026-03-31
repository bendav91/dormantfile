"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Trash2, AlertTriangle, Building2, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface SettingsActionsProps {
  hasSubscription: boolean;
  hasStripeCustomer: boolean;
  isAgentTier: boolean;
  filingAsAgent: boolean;
  remindersMuted: boolean;
  showMutedSuccess?: boolean;
  companies: { id: string; name: string }[];
}

export default function SettingsActions({
  hasSubscription,
  hasStripeCustomer,
  isAgentTier,
  filingAsAgent,
  remindersMuted,
  showMutedSuccess,
  companies,
}: SettingsActionsProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [removingCompanyId, setRemovingCompanyId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [agentMode, setAgentMode] = useState(filingAsAgent);
  const [savingAgentMode, setSavingAgentMode] = useState(false);
  const [muted, setMuted] = useState(remindersMuted);
  const [savingMuted, setSavingMuted] = useState(false);

  async function handleManageBilling() {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
    }
  }

  async function handleToggleMuted() {
    setSavingMuted(true);
    try {
      const res = await fetch("/api/account/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remindersMuted: !muted }),
      });
      if (res.ok) {
        setMuted(!muted);
      }
    } finally {
      setSavingMuted(false);
    }
  }

  async function handleToggleAgentMode() {
    setSavingAgentMode(true);
    try {
      const res = await fetch("/api/account/agent-preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filingAsAgent: !agentMode }),
      });
      if (res.ok) {
        setAgentMode(!agentMode);
      }
    } finally {
      setSavingAgentMode(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete account. Please try again.");
        setDeleting(false);
        return;
      }

      await signOut({ callbackUrl: "/" });
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setDeleting(false);
    }
  }

  async function handleRemoveCompany(companyId: string) {
    setRemovingCompanyId(companyId);
    setRemoveError("");

    try {
      const res = await fetch("/api/company/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setRemoveError(data.error || "Failed to remove company.");
        setRemovingCompanyId(null);
        return;
      }

      setConfirmRemoveId(null);
      setRemovingCompanyId(null);
      router.refresh();
    } catch {
      setRemoveError("An unexpected error occurred.");
      setRemovingCompanyId(null);
    }
  }

  return (
    <>
      {/* Billing section */}
      {hasStripeCustomer && (
        <div className="bg-card rounded-xl p-7 shadow-md mb-6">
          <h2 className="text-[17px] font-bold text-foreground m-0 mb-2 tracking-[-0.01em]">
            Billing
          </h2>
          <p className="text-sm text-body m-0 mb-5">
            {hasSubscription
              ? "View invoices, update your payment method, or cancel your subscription."
              : "View your past invoices or resubscribe."}
          </p>
          <button
            onClick={handleManageBilling}
            className="focus-ring inline-flex items-center gap-2 bg-primary text-card px-5 py-2.5 rounded-lg font-semibold text-sm border-0 cursor-pointer transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
          >
            <CreditCard size={16} strokeWidth={2} />
            Manage billing
          </button>
          {hasSubscription && (
            <Link
              href="/choose-plan"
              className="focus-ring inline-flex items-center gap-2 bg-transparent text-primary px-5 py-2.5 rounded-lg font-semibold text-sm border-2 border-primary no-underline transition-all duration-200 ml-2.5"
            >
              <ArrowUpCircle size={16} strokeWidth={2} />
              Change plan
            </Link>
          )}
        </div>
      )}

      {/* Filing mode section */}
      {isAgentTier && (
        <div className="bg-card rounded-xl p-7 shadow-md mb-6">
          <h2 className="text-[17px] font-bold text-foreground m-0 mb-2 tracking-[-0.01em]">
            Filing mode
          </h2>
          <p className="text-sm text-body m-0 mb-5">
            {agentMode
              ? "You\u2019re filing as an agent on behalf of client companies. CT600 submissions will use your agent Government Gateway credentials."
              : "You\u2019re filing as a company director. CT600 submissions will use each company\u2019s own Government Gateway credentials."}
          </p>
          <button
            onClick={handleToggleAgentMode}
            disabled={savingAgentMode}
            className={cn(
              "focus-ring inline-flex items-center gap-2 bg-transparent text-primary px-5 py-2.5 rounded-lg font-semibold text-sm border-2 border-primary transition-all duration-200",
              savingAgentMode ? "cursor-not-allowed opacity-60" : "cursor-pointer opacity-100"
            )}
          >
            {savingAgentMode
              ? "Saving\u2026"
              : agentMode
                ? "Switch to director mode"
                : "Switch to agent mode"}
          </button>
        </div>
      )}

      {/* Notifications section */}
      <div className="bg-card rounded-xl p-7 shadow-md mb-6">
        <h2 className="text-[17px] font-bold text-foreground m-0 mb-2 tracking-[-0.01em]">
          Notifications
        </h2>
        <p className="text-sm text-body m-0 mb-5">
          Control which emails you receive from DormantFile.
        </p>
        {showMutedSuccess && (
          <div className="bg-success-bg border border-success-border rounded-lg px-4 py-3 mb-4 text-sm text-success-text">
            Reminder emails have been muted.
          </div>
        )}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-semibold text-foreground m-0 mb-0.5">
              Reminder emails
            </p>
            <p className="text-[13px] text-muted m-0">
              Receive email reminders when filing deadlines are approaching
            </p>
          </div>
          <button
            onClick={handleToggleMuted}
            disabled={savingMuted}
            className={cn(
              "focus-ring relative w-[44px] h-[24px] rounded-xl border-0 shrink-0 transition-colors duration-200",
              savingMuted ? "cursor-wait" : "cursor-pointer",
              muted ? "bg-border" : "bg-primary"
            )}
          >
            <span
              className={cn(
                "absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-[left] duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.2)]",
                muted ? "left-[2px]" : "left-[22px]"
              )}
            />
          </button>
        </div>
      </div>

      {/* Companies section */}
      {companies.length > 0 && (
        <div className="bg-card rounded-xl p-7 shadow-md mb-6">
          <h2 className="text-[17px] font-bold text-foreground m-0 mb-2 tracking-[-0.01em]">
            Companies
          </h2>
          <p className="text-sm text-body m-0 mb-5">
            Remove a company to delete its filing history and reminders. Your account and
            subscription remain active.
          </p>

          {removeError && (
            <div
              role="alert"
              className="px-4 py-3 bg-danger-bg border border-danger-border rounded-lg text-sm text-danger mb-4"
            >
              {removeError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between px-4 py-3.5 bg-page rounded-lg border border-border"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-primary">
                    <Building2 size={16} color="currentColor" strokeWidth={2} />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {company.name}
                  </span>
                </div>

                {confirmRemoveId === company.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-danger">Remove?</span>
                    <button
                      onClick={() => handleRemoveCompany(company.id)}
                      disabled={removingCompanyId === company.id}
                      className={cn(
                        "focus-ring bg-danger text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] border-0 transition-all duration-200",
                        removingCompanyId === company.id ? "cursor-not-allowed" : "cursor-pointer"
                      )}
                    >
                      {removingCompanyId === company.id ? "\u2026" : "Yes"}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      disabled={removingCompanyId === company.id}
                      className="focus-ring bg-transparent text-body px-3.5 py-1.5 rounded-md font-semibold text-[13px] border border-disabled cursor-pointer transition-all duration-200"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(company.id)}
                    className="focus-ring bg-transparent text-danger py-1 px-3 rounded-md font-semibold text-[13px] border border-danger-border cursor-pointer transition-all duration-200 hover:bg-danger-bg"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="bg-card rounded-xl p-7 shadow-md border border-danger-border">
        <h2 className="text-[17px] font-bold text-danger m-0 mb-2 tracking-[-0.01em]">
          Danger zone
        </h2>
        <p className="text-sm text-body m-0 mb-5">
          Permanently delete your account, all company data, and filing history.
          {hasSubscription && " Your subscription will be cancelled immediately."} This action
          cannot be undone.
        </p>

        {error && (
          <div
            role="alert"
            className="px-4 py-3 bg-danger-bg border border-danger-border rounded-lg text-sm text-danger mb-4"
          >
            {error}
          </div>
        )}

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="focus-ring inline-flex items-center gap-2 bg-transparent text-danger px-5 py-2.5 rounded-lg font-semibold text-sm border-2 border-danger cursor-pointer transition-all duration-200 hover:bg-danger-bg"
          >
            <Trash2 size={16} strokeWidth={2} />
            Delete my account
          </button>
        ) : (
          <div className="p-5 bg-danger-bg border border-danger-border rounded-lg">
            <div className="flex items-start gap-2.5 mb-4">
              <span className="text-danger shrink-0 mt-px">
                <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
              </span>
              <p className="text-sm text-danger-text m-0 leading-relaxed">
                Are you sure? This will permanently delete your account,
                {companies.length > 0
                  ? ` ${companies.length} ${companies.length === 1 ? "company" : "companies"},`
                  : ""}{" "}
                and all filing records. Your subscription will be cancelled and you will be signed
                out.
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className={cn(
                  "focus-ring text-card px-5 py-2.5 rounded-lg font-semibold text-sm border-0 transition-all duration-200",
                  deleting ? "bg-disabled cursor-not-allowed" : "bg-danger cursor-pointer"
                )}
              >
                {deleting ? "Deleting\u2026" : "Yes, delete everything"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="focus-ring bg-transparent text-body px-5 py-2.5 rounded-lg font-semibold text-sm border border-disabled cursor-pointer transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
