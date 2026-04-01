"use client";

import FilingConfirmationDialog from "@/components/filing-confirmation-dialog";
import { cn } from "@/lib/cn";
import { AlertTriangle, Building2, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "confirm" | "authenticate" | "submitting" | "result";

type ResultState =
  | { type: "accepted" }
  | { type: "rejected"; message: string }
  | { type: "timeout" }
  | { type: "failed"; message: string };

interface Props {
  companyId: string;
  companyName: string;
  companyRegistrationNumber: string;
  periodStart: string;
  periodEnd: string;
  periodStartISO: string;
  periodEndISO: string;
  shareCapitalPence: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-[0.05em] mb-1">{label}</p>
      <p className="text-[15px] text-foreground m-0 font-medium">{value}</p>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepConfirm({
  companyName,
  companyRegistrationNumber,
  periodStart,
  periodEnd,
  shareCapitalPence,
  onContinue,
}: {
  companyName: string;
  companyRegistrationNumber: string;
  periodStart: string;
  periodEnd: string;
  shareCapitalPence: number;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          File annual accounts
        </h1>
        <p className="text-[15px] text-body m-0 leading-relaxed">
          Review your company details before submitting dormant company accounts to Companies House.
        </p>
      </div>

      <div className="bg-card rounded-xl p-8 shadow-card">
        {/* Company header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-border-subtle">
          <div className="w-[42px] h-[42px] rounded-[10px] bg-primary-bg flex items-center justify-center shrink-0">
            <span className="text-primary">
              <Building2 size={20} color="currentColor" strokeWidth={2} />
            </span>
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-foreground m-0 tracking-[-0.01em]">
              {companyName}
            </h2>
            <p className="text-[13px] text-muted m-0 mt-0.5">Annual accounts</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          <DetailRow label="Company number" value={companyRegistrationNumber} />
          <DetailRow
            label="Filing type"
            value={
              shareCapitalPence > 0
                ? `Dormant accounts (\u00A3${(shareCapitalPence / 100).toFixed(shareCapitalPence % 100 === 0 ? 0 : 2)} share capital)`
                : "Dormant accounts (nil balance sheet)"
            }
          />
          <DetailRow label="Period start" value={periodStart} />
          <DetailRow label="Period end" value={periodEnd} />
        </div>

        {/* Info card */}
        <div className="flex items-start gap-2.5 px-4 py-3.5 bg-primary-bg border border-primary-border rounded-lg mb-7">
          <span className="text-primary shrink-0 mt-px">
            <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-primary-text m-0 leading-normal">
            {shareCapitalPence > 0
              ? `This will submit dormant company accounts to Companies House with a balance sheet showing \u00A3${(shareCapitalPence / 100).toFixed(shareCapitalPence % 100 === 0 ? 0 : 2)} share capital and no other assets, liabilities, or activity.`
              : "This will submit dormant company accounts to Companies House confirming the company had nil assets, liabilities, and shareholder funds during this period."}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="focus-ring bg-cta text-card px-6 py-3 rounded-lg font-semibold text-base border-0 cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 w-full hover:opacity-90 hover:-translate-y-px"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepAuthenticate({ onSubmit }: { onSubmit: (authCode: string) => void }) {
  const [authCode, setAuthCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const trimmed = authCode.trim();
    if (!trimmed) {
      setError("Please enter your company authentication code.");
      return;
    }
    if (!/^[A-Za-z0-9]{6}$/.test(trimmed)) {
      setError("The authentication code must be exactly 6 alphanumeric characters.");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          Companies House authentication
        </h1>
        <p className="text-[15px] text-body m-0 leading-relaxed">
          Enter your company authentication code to authorise this filing.
        </p>
      </div>

      <div className="bg-card rounded-xl p-8 shadow-card">
        <div className="mb-6">
          <label htmlFor="ch-auth-code" className="block text-[13px] font-semibold text-body mb-2">
            Company authentication code
          </label>
          <input
            id="ch-auth-code"
            type="text"
            maxLength={6}
            value={authCode}
            onChange={(e) => {
              setAuthCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="e.g. A1B2C3"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "focus-ring-input w-full py-3 px-3.5 text-base font-mono tracking-[0.15em] text-foreground border-2 rounded-lg transition-colors duration-200 box-border",
              "focus:border-primary",
              error ? "border-danger" : "border-muted",
            )}
          />
          {error && (
            <p role="alert" className="text-[13px] text-danger mt-2 mb-0">
              {error}
            </p>
          )}
        </div>

        {/* Info card */}
        <div className="flex items-start gap-2.5 px-4 py-3.5 bg-primary-bg border border-primary-border rounded-lg mb-7">
          <span className="text-primary shrink-0 mt-px">
            <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-primary-text m-0 leading-normal">
            This is the 6-character code Companies House posted to your company&apos;s registered
            office. It authorises filings on behalf of your company.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="focus-ring bg-cta text-card px-6 py-3 rounded-lg font-semibold text-base border-0 cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 w-full hover:opacity-90 hover:-translate-y-px"
        >
          <ShieldCheck size={17} strokeWidth={2} />
          Submit to Companies House
        </button>
      </div>
    </div>
  );
}

function StepSubmitting() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          Submitting to Companies House
        </h1>
        <p className="text-[15px] text-body m-0 leading-relaxed">
          Please wait while we securely submit your accounts.
        </p>
      </div>

      <div className="bg-card rounded-xl p-8 shadow-card">
        <div className="flex flex-col items-center text-center pt-5 pb-3 gap-6">
          {/* Spinner */}
          <div className="w-16 h-16 rounded-full border-4 border-border border-t-primary animate-spin" />

          <div>
            <p className="text-lg font-bold text-foreground mb-2 tracking-[-0.01em]">
              {"Submitting to Companies House\u2026"}
            </p>
            <p className="text-sm text-body m-0 leading-relaxed max-w-[340px]">
              This may take up to two minutes. Please do not close this page.
            </p>
          </div>

          {/* Progress steps */}
          <div className="w-full border-t border-border-subtle pt-6 flex flex-col gap-3 text-left">
            {[
              "Building iXBRL accounts document",
              "Submitting to Companies House",
              "Awaiting Companies House acknowledgement",
            ].map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 text-sm text-body"
                style={{
                  animation: `accounts-fade-in 400ms ease both`,
                  animationDelay: `${index * 300}ms`,
                }}
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 opacity-60" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes accounts-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function StepResult({
  result,
  onTryAgain,
  onDashboard,
}: {
  result: ResultState;
  onTryAgain: () => void;
  onDashboard: () => void;
}) {
  if (result.type === "accepted") {
    return (
      <div>
        <div className="mb-7">
          <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
            Filing complete
          </h1>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card">
          <div className="p-6 bg-success-bg border border-success-border rounded-[10px] flex flex-col items-center text-center gap-4 mb-6">
            <span className="text-success">
              <CheckCircle2 size={48} color="currentColor" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-success-text mb-2 tracking-[-0.01em]">
                Filing Accepted
              </h2>
              <p className="text-[15px] text-success-text m-0 leading-relaxed">
                Companies House has accepted your dormant company accounts. A confirmation has been
                sent to your email address, and your next accounting period has been set up
                automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onDashboard}
            className="focus-ring bg-primary text-card px-6 py-3 rounded-lg font-semibold text-base border-0 cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 w-full hover:opacity-90 hover:-translate-y-px"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (result.type === "rejected") {
    return (
      <div>
        <div className="mb-7">
          <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
            Filing rejected
          </h1>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card">
          <div className="p-6 bg-danger-bg border border-danger-border rounded-[10px] flex flex-col items-center text-center gap-4 mb-6">
            <span className="text-danger-deep">
              <XCircle size={48} color="currentColor" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-danger-text mb-2 tracking-[-0.01em]">
                Filing Rejected
              </h2>
              <p className="text-sm text-danger-text m-0 leading-relaxed font-mono break-words">
                {result.message}
              </p>
            </div>
          </div>
          <button
            onClick={onTryAgain}
            className="focus-ring bg-cta text-card px-6 py-3 rounded-lg font-semibold text-base border-0 cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 w-full hover:opacity-90 hover:-translate-y-px"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (result.type === "timeout") {
    return (
      <div>
        <div className="mb-7">
          <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
            Still processing
          </h1>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card">
          <div className="p-6 bg-warning-bg border border-warning-border rounded-[10px] flex flex-col items-center text-center gap-4 mb-6">
            <span className="text-warning-deep">
              <AlertTriangle size={48} color="currentColor" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-warning-text mb-2 tracking-[-0.01em]">
                Companies House is still processing
              </h2>
              <p className="text-[15px] text-warning-deep m-0 leading-relaxed">
                Your accounts have been submitted but Companies House has not yet confirmed the
                outcome. You can check the status from your dashboard - it may take a few more
                minutes.
              </p>
            </div>
          </div>
          <button
            onClick={onDashboard}
            className="focus-ring bg-primary text-card px-6 py-3 rounded-lg font-semibold text-base border-0 cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 w-full hover:opacity-90 hover:-translate-y-px"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  // failed
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          Submission failed
        </h1>
      </div>
      <div className="bg-card rounded-xl p-8 shadow-card">
        <div className="p-6 bg-danger-bg border border-danger-border rounded-[10px] flex flex-col items-center text-center gap-4 mb-6">
          <span className="text-danger-deep">
            <XCircle size={48} color="currentColor" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-danger-text mb-2 tracking-[-0.01em]">
              Submission Failed
            </h2>
            <p className="text-[15px] text-danger-text m-0 leading-relaxed">
              {result.message || "An unexpected error occurred. Please try again."}
            </p>
          </div>
        </div>
        <button
          onClick={onTryAgain}
          className="focus-ring bg-cta text-card px-6 py-3 rounded-lg font-semibold text-base border-0 cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 w-full hover:opacity-90 hover:-translate-y-px"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AccountsFlow({
  companyId,
  companyName,
  companyRegistrationNumber,
  periodStart,
  periodEnd,
  periodStartISO,
  periodEndISO,
  shareCapitalPence,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("confirm");
  const [result, setResult] = useState<ResultState | null>(null);
  const [pendingAuthCode, setPendingAuthCode] = useState<string | null>(null);

  async function handleSubmit(companyAuthCode: string) {
    setStep("submitting");

    try {
      const res = await fetch("/api/file/submit-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          companyAuthCode,
          periodStart: periodStartISO,
          periodEnd: periodEndISO,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({
          type: "failed",
          message: data.error || "An unexpected error occurred. Please try again.",
        });
        setStep("result");
        return;
      }

      const status: string = data.status;

      if (status === "accepted") {
        setResult({ type: "accepted" });
      } else if (status === "rejected") {
        setResult({
          type: "rejected",
          message: data.message || "Companies House rejected the filing.",
        });
      } else if (status === "submitted") {
        setResult({ type: "timeout" });
      } else {
        setResult({
          type: "failed",
          message: data.message || "An unexpected error occurred.",
        });
      }

      setStep("result");
    } catch {
      setResult({
        type: "failed",
        message: "A network error occurred. Please check your connection and try again.",
      });
      setStep("result");
    }
  }

  function handleTryAgain() {
    setResult(null);
    setStep("confirm");
  }

  function handleDashboard() {
    router.push("/dashboard");
  }

  if (step === "confirm") {
    return (
      <StepConfirm
        companyName={companyName}
        companyRegistrationNumber={companyRegistrationNumber}
        periodStart={periodStart}
        periodEnd={periodEnd}
        shareCapitalPence={shareCapitalPence}
        onContinue={() => setStep("authenticate")}
      />
    );
  }

  if (step === "authenticate") {
    return (
      <>
        <StepAuthenticate onSubmit={(authCode) => setPendingAuthCode(authCode)} />
        {pendingAuthCode !== null && (
          <FilingConfirmationDialog
            filingType="accounts"
            companyName={companyName}
            periodStart={periodStart}
            periodEnd={periodEnd}
            onConfirm={() => {
              const code = pendingAuthCode;
              setPendingAuthCode(null);
              handleSubmit(code);
            }}
            onCancel={() => setPendingAuthCode(null)}
          />
        )}
      </>
    );
  }

  if (step === "submitting") {
    return <StepSubmitting />;
  }

  // result step
  return <StepResult result={result!} onTryAgain={handleTryAgain} onDashboard={handleDashboard} />;
}
