"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Lock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FilingConfirmationDialog from "@/components/filing-confirmation-dialog";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "confirm" | "credentials" | "submitting" | "result";

type ResultState =
  | { type: "accepted" }
  | { type: "rejected"; message: string }
  | { type: "timeout" }
  | { type: "failed"; message: string };

interface Props {
  companyId: string;
  companyName: string;
  uniqueTaxReference: string;
  declarantName: string;
  periodStart: string;
  periodEnd: string;
  periodStartISO: string;
  periodEndISO: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FocusableInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  spellCheck,
  hasError,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  autoComplete?: string;
  spellCheck?: boolean;
  hasError?: boolean;
}) {
  return (
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      className={cn(
        "focus-ring-input w-full px-4 py-3 border border-muted rounded-lg text-base text-foreground bg-card transition-colors duration-200 box-border",
        "focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]",
        hasError && "border-danger"
      )}
    />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-[0.05em] mb-1">
        {label}
      </p>
      <p className="text-[15px] text-foreground m-0 font-medium">
        {value}
      </p>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepConfirm({
  companyName,
  uniqueTaxReference,
  periodStart,
  periodEnd,
  onContinue,
}: {
  companyName: string;
  uniqueTaxReference: string;
  periodStart: string;
  periodEnd: string;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          Review and confirm
        </h1>
        <p className="text-[15px] text-body m-0 leading-relaxed">
          Check your company details before proceeding to submit your nil CT600 return.
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
            <p className="text-[13px] text-muted m-0 mt-0.5">
              Corporation Tax return
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          <DetailRow label="Unique Tax Reference" value={uniqueTaxReference} />
          <DetailRow label="Return type" value="Nil CT600" />
          <DetailRow label="Period start" value={periodStart} />
          <DetailRow label="Period end" value={periodEnd} />
        </div>

        {/* Info card */}
        <div className="flex items-start gap-2.5 px-4 py-3.5 bg-primary-bg border border-primary-border rounded-lg mb-7">
          <span className="text-primary shrink-0 mt-px">
            <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-primary-text m-0 leading-normal">
            This will submit a nil Corporation Tax return to HMRC for the period shown above. A nil
            return declares that the company had no taxable profit or tax to pay.
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

function StepCredentials({
  onSubmit,
  onBack,
}: {
  onSubmit: (username: string, password: string) => void;
  onBack: () => void;
}) {
  const [gatewayUsername, setGatewayUsername] = useState("");
  const [gatewayPassword, setGatewayPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { username?: string; password?: string } = {};
    if (!gatewayUsername.trim()) {
      errs.username = "Government Gateway User ID is required.";
    }
    if (!gatewayPassword) {
      errs.password = "Government Gateway Password is required.";
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit(gatewayUsername.trim(), gatewayPassword);
  }

  return (
    <div>
      <div className="mb-7">
        <button
          onClick={onBack}
          className="focus-ring inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-sm text-body cursor-pointer mb-5 font-medium transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Back
        </button>
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          Government Gateway credentials
        </h1>
        <p className="text-[15px] text-body m-0 leading-relaxed">
          Enter your Government Gateway credentials to authorise the submission. These are used once
          to sign your return and are never stored.
        </p>
      </div>

      <div className="bg-card rounded-xl p-8 shadow-card">
        {/* Security notice */}
        <div className="flex items-start gap-2.5 px-4 py-3.5 bg-success-bg border border-success-border rounded-lg mb-7">
          <span className="text-success shrink-0 mt-px">
            <Lock size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-success-text m-0 leading-normal">
            Your credentials are transmitted securely over HTTPS directly to HMRC. They are used
            only for this submission and are never stored or logged.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-5 mb-7">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="gatewayUsername"
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                <span className="text-primary">
                  <ShieldCheck size={15} color="currentColor" strokeWidth={2} />
                </span>
                Government Gateway User ID
              </label>
              <FocusableInput
                id="gatewayUsername"
                type="text"
                value={gatewayUsername}
                onChange={(e) => setGatewayUsername(e.target.value)}
                placeholder="Enter your User ID"
                autoComplete="username"
                spellCheck={false}
                hasError={!!errors.username}
              />
              {errors.username ? (
                <p role="alert" className="text-[13px] text-danger m-0">
                  {errors.username}
                </p>
              ) : (
                <p className="text-[13px] text-body m-0">
                  Your 12-digit Government Gateway User ID from HMRC.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="gatewayPassword"
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                <span className="text-primary">
                  <Lock size={15} color="currentColor" strokeWidth={2} />
                </span>
                Government Gateway Password
              </label>
              <FocusableInput
                id="gatewayPassword"
                type="password"
                value={gatewayPassword}
                onChange={(e) => setGatewayPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                hasError={!!errors.password}
              />
              {errors.password ? (
                <p role="alert" className="text-[13px] text-danger m-0">
                  {errors.password}
                </p>
              ) : (
                <p className="text-[13px] text-body m-0">
                  The password associated with your Government Gateway account.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="focus-ring bg-cta text-card px-6 py-3 rounded-lg font-semibold text-base border-0 cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 w-full hover:opacity-90 hover:-translate-y-px"
          >
            <ShieldCheck size={17} strokeWidth={2} />
            Submit to HMRC
          </button>
        </form>
      </div>
    </div>
  );
}

function StepSubmitting() {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          Submitting to HMRC
        </h1>
        <p className="text-[15px] text-body m-0 leading-relaxed">
          Please wait while we securely submit your return.
        </p>
      </div>

      <div className="bg-card rounded-xl p-8 shadow-card">
        <div className="flex flex-col items-center text-center pt-5 pb-3 gap-6">
          {/* Spinner */}
          <div className="w-16 h-16 rounded-full border-4 border-border border-t-primary animate-spin" />

          <div>
            <p className="text-lg font-bold text-foreground mb-2 tracking-[-0.01em]">
              {"Submitting to HMRC\u2026"}
            </p>
            <p className="text-sm text-body m-0 leading-relaxed max-w-[340px]">
              This may take up to two minutes. Please do not close this page.
            </p>
          </div>

          {/* Progress steps */}
          <div className="w-full border-t border-border-subtle pt-6 flex flex-col gap-3 text-left">
            {[
              "Building secure XML message",
              "Submitting to HMRC transaction engine",
              "Awaiting HMRC acknowledgement",
            ].map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 text-sm text-body"
                style={{
                  animation: `filing-fade-in 400ms ease both`,
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
        @keyframes filing-fade-in {
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
                HMRC has accepted your nil CT600 return. A confirmation has been sent to your email
                address, and your next accounting period has been set up automatically.
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
                HMRC is still processing
              </h2>
              <p className="text-[15px] text-warning-deep m-0 leading-relaxed">
                Your return has been submitted but HMRC has not yet confirmed the outcome. You can
                check the status from your dashboard - it may take a few more minutes.
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

export default function FilingFlow({
  companyId,
  companyName,
  uniqueTaxReference,
  periodStart,
  periodEnd,
  periodStartISO,
  periodEndISO,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("confirm");
  const [result, setResult] = useState<ResultState | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  async function handleSubmit(gatewayUsername: string, gatewayPassword: string) {
    setStep("submitting");

    try {
      const res = await fetch("/api/file/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          gatewayUsername,
          gatewayPassword,
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
        setResult({ type: "rejected", message: data.message || "HMRC rejected the filing." });
      } else if (status === "polling_timeout") {
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
    setStep("credentials");
  }

  function handleDashboard() {
    router.push("/dashboard");
  }

  if (step === "confirm") {
    return (
      <StepConfirm
        companyName={companyName}
        uniqueTaxReference={uniqueTaxReference}
        periodStart={periodStart}
        periodEnd={periodEnd}
        onContinue={() => setStep("credentials")}
      />
    );
  }

  if (step === "credentials") {
    return (
      <>
        <StepCredentials
          onSubmit={(username, password) => setPendingCredentials({ username, password })}
          onBack={() => setStep("confirm")}
        />
        {pendingCredentials !== null && (
          <FilingConfirmationDialog
            filingType="ct600"
            companyName={companyName}
            periodStart={periodStart}
            periodEnd={periodEnd}
            onConfirm={() => {
              const { username, password } = pendingCredentials;
              setPendingCredentials(null);
              handleSubmit(username, password);
            }}
            onCancel={() => setPendingCredentials(null)}
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
