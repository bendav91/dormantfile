"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ─── Shared style constants ───────────────────────────────────────────────────

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--color-cta)",
  color: "var(--color-bg-card)",
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "16px",
  border: "none",
  cursor: "pointer",
  transition: "opacity 200ms, transform 200ms",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--color-primary)",
  color: "var(--color-bg-card)",
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "16px",
  border: "none",
  cursor: "pointer",
  transition: "opacity 200ms, transform 200ms",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-bg-card)",
  borderRadius: "12px",
  padding: "32px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
};

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
        {label}
      </p>
      <p style={{ fontSize: "15px", color: "var(--color-text-primary)", margin: 0, fontWeight: 500 }}>
        {value}
      </p>
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
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          File annual accounts
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-text-body)", margin: 0, lineHeight: 1.6 }}>
          Review your company details before submitting dormant company accounts to Companies House.
        </p>
      </div>

      <div style={cardStyle}>
        {/* Company header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            paddingBottom: "20px",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "var(--color-primary-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "var(--color-primary)" }}>
              <Building2 size={20} color="currentColor" strokeWidth={2} />
            </span>
          </div>
          <div>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {companyName}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0, marginTop: "2px" }}>
              Annual accounts
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <DetailRow label="Company number" value={companyRegistrationNumber} />
          <DetailRow label="Filing type" value={shareCapitalPence > 0 ? `Dormant accounts (£${(shareCapitalPence / 100).toFixed(shareCapitalPence % 100 === 0 ? 0 : 2)} share capital)` : "Dormant accounts (nil balance sheet)"} />
          <DetailRow label="Period start" value={periodStart} />
          <DetailRow label="Period end" value={periodEnd} />
        </div>

        {/* Info card */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "14px 16px",
            backgroundColor: "var(--color-primary-bg)",
            border: "1px solid var(--color-primary-border)",
            borderRadius: "8px",
            marginBottom: "28px",
          }}
        >
          <span style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "1px" }}>
            <ShieldCheck
              size={18}
              color="currentColor"
              strokeWidth={2}
            />
          </span>
          <p style={{ fontSize: "14px", color: "var(--color-primary-text)", margin: 0, lineHeight: 1.5 }}>
            {shareCapitalPence > 0
              ? `This will submit dormant company accounts to Companies House with a balance sheet showing £${(shareCapitalPence / 100).toFixed(shareCapitalPence % 100 === 0 ? 0 : 2)} share capital and no other assets, liabilities, or activity.`
              : "This will submit dormant company accounts to Companies House confirming the company had nil assets, liabilities, and shareholder funds during this period."}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="focus-ring"
          style={primaryButtonStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepAuthenticate({
  onSubmit,
}: {
  onSubmit: (authCode: string) => void;
}) {
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
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Companies House authentication
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-text-body)", margin: 0, lineHeight: 1.6 }}>
          Enter your company authentication code to authorise this filing.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: "24px" }}>
          <label
            htmlFor="ch-auth-code"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-body)",
              marginBottom: "8px",
            }}
          >
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
            className="focus-ring-input"
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: "16px",
              fontFamily: "monospace",
              letterSpacing: "0.15em",
              color: "var(--color-text-primary)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: error ? "var(--color-danger)" : "var(--color-text-muted)",
              borderRadius: "8px",
              transition: "border-color 200ms",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = "var(--color-primary)";
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = "var(--color-border)";
            }}
          />
          {error && (
            <p role="alert" style={{ fontSize: "13px", color: "var(--color-danger)", margin: "8px 0 0 0" }}>
              {error}
            </p>
          )}
        </div>

        {/* Info card */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "14px 16px",
            backgroundColor: "var(--color-primary-bg)",
            border: "1px solid var(--color-primary-border)",
            borderRadius: "8px",
            marginBottom: "28px",
          }}
        >
          <span style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "1px" }}>
            <ShieldCheck
              size={18}
              color="currentColor"
              strokeWidth={2}
            />
          </span>
          <p style={{ fontSize: "14px", color: "var(--color-primary-text)", margin: 0, lineHeight: 1.5 }}>
            This is the 6-character code Companies House posted to your company&apos;s registered office. It authorises filings on behalf of your company.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="focus-ring"
          style={primaryButtonStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
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
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Submitting to Companies House
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-text-body)", margin: 0, lineHeight: 1.6 }}>
          Please wait while we securely submit your accounts.
        </p>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "20px 0 12px",
            gap: "24px",
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              border: "4px solid var(--color-border)",
              borderTopColor: "var(--color-primary)",
              animation: "spin 0.9s linear infinite",
            }}
          />

          <div>
            <p
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: "0 0 8px 0",
                letterSpacing: "-0.01em",
              }}
            >
              Submitting to Companies House\u2026
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-body)",
                margin: 0,
                lineHeight: 1.6,
                maxWidth: "340px",
              }}
            >
              This may take up to two minutes. Please do not close this page.
            </p>
          </div>

          {/* Progress steps */}
          <div
            style={{
              width: "100%",
              borderTop: "1px solid var(--color-border-subtle)",
              paddingTop: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              textAlign: "left",
            }}
          >
            {[
              "Building iXBRL accounts document",
              "Submitting to Companies House",
              "Awaiting Companies House acknowledgement",
            ].map((step, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  color: "var(--color-text-body)",
                  animation: `accounts-fade-in 400ms ease both`,
                  animationDelay: `${index * 300}ms`,
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-primary)",
                    flexShrink: 0,
                    opacity: 0.6,
                  }}
                />
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
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Filing complete
          </h1>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              padding: "24px",
              backgroundColor: "var(--color-success-bg)",
              border: "1px solid var(--color-success-border)",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <span style={{ color: "var(--color-success)" }}>
              <CheckCircle2 size={48} color="currentColor" strokeWidth={1.5} />
            </span>
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--color-success-text)",
                  margin: "0 0 8px 0",
                  letterSpacing: "-0.01em",
                }}
              >
                Filing Accepted
              </h2>
              <p style={{ fontSize: "15px", color: "var(--color-success-text)", margin: 0, lineHeight: 1.6 }}>
                Companies House has accepted your dormant company accounts. A confirmation has been sent to your email address, and your next accounting period has been set up automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onDashboard}
            className="focus-ring"
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
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
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Filing rejected
          </h1>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              padding: "24px",
              backgroundColor: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <span style={{ color: "var(--color-danger-deep)" }}>
              <XCircle size={48} color="currentColor" strokeWidth={1.5} />
            </span>
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--color-danger-text)",
                  margin: "0 0 8px 0",
                  letterSpacing: "-0.01em",
                }}
              >
                Filing Rejected
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-danger-text)",
                  margin: 0,
                  lineHeight: 1.6,
                  fontFamily: "monospace",
                  wordBreak: "break-word",
                }}
              >
                {result.message}
              </p>
            </div>
          </div>
          <button
            onClick={onTryAgain}
            className="focus-ring"
            style={primaryButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
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
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "0 0 8px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Still processing
          </h1>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              padding: "24px",
              backgroundColor: "var(--color-warning-bg)",
              border: "1px solid var(--color-warning-border)",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <span style={{ color: "var(--color-warning-deep)" }}>
              <AlertTriangle size={48} color="currentColor" strokeWidth={1.5} />
            </span>
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--color-warning-text)",
                  margin: "0 0 8px 0",
                  letterSpacing: "-0.01em",
                }}
              >
                Companies House is still processing
              </h2>
              <p style={{ fontSize: "15px", color: "var(--color-warning-deep)", margin: 0, lineHeight: 1.6 }}>
                Your accounts have been submitted but Companies House has not yet confirmed the outcome. You can check the status from your dashboard - it may take a few more minutes.
              </p>
            </div>
          </div>
          <button
            onClick={onDashboard}
            className="focus-ring"
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
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
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Submission failed
        </h1>
      </div>
      <div style={cardStyle}>
        <div
          style={{
            padding: "24px",
            backgroundColor: "var(--color-danger-bg)",
            border: "1px solid var(--color-danger-border)",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <span style={{ color: "var(--color-danger-deep)" }}>
            <XCircle size={48} color="currentColor" strokeWidth={1.5} />
          </span>
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--color-danger-text)",
                margin: "0 0 8px 0",
                letterSpacing: "-0.01em",
              }}
            >
              Submission Failed
            </h2>
            <p style={{ fontSize: "15px", color: "var(--color-danger-text)", margin: 0, lineHeight: 1.6 }}>
              {result.message || "An unexpected error occurred. Please try again."}
            </p>
          </div>
        </div>
        <button
          onClick={onTryAgain}
          className="focus-ring"
          style={primaryButtonStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
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

  async function handleSubmit(companyAuthCode: string) {
    setStep("submitting");

    try {
      const res = await fetch("/api/file/submit-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, companyAuthCode, periodStart: periodStartISO, periodEnd: periodEndISO }),
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
        setResult({ type: "rejected", message: data.message || "Companies House rejected the filing." });
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
      <StepAuthenticate
        onSubmit={handleSubmit}
      />
    );
  }

  if (step === "submitting") {
    return <StepSubmitting />;
  }

  // result step
  return (
    <StepResult
      result={result!}
      onTryAgain={handleTryAgain}
      onDashboard={handleDashboard}
    />
  );
}
