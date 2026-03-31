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

// ─── Shared style constants ───────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "var(--color-text-muted)",
  borderRadius: "8px",
  fontSize: "16px",
  color: "var(--color-text-primary)",
  backgroundColor: "var(--color-bg-card)",
  transition: "border-color 200ms, box-shadow 200ms",
  boxSizing: "border-box",
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: "var(--color-primary)",
  boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent)",
};

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
  const [focused, setFocused] = useState(false);

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
      className="focus-ring-input"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        ...(focused ? inputFocusStyle : {}),
        ...(hasError ? { borderColor: "var(--color-danger)" } : {}),
      }}
    />
  );
}

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
      <p
        style={{ fontSize: "15px", color: "var(--color-text-primary)", margin: 0, fontWeight: 500 }}
      >
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
          Review and confirm
        </h1>
        <p
          style={{ fontSize: "15px", color: "var(--color-text-body)", margin: 0, lineHeight: 1.6 }}
        >
          Check your company details before proceeding to submit your nil CT600 return.
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
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-muted)",
                margin: 0,
                marginTop: "2px",
              }}
            >
              Corporation Tax return
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
          <DetailRow label="Unique Tax Reference" value={uniqueTaxReference} />
          <DetailRow label="Return type" value="Nil CT600" />
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
            <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-primary-text)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            This will submit a nil Corporation Tax return to HMRC for the period shown above. A nil
            return declares that the company had no taxable profit or tax to pay.
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
      <div style={{ marginBottom: "28px" }}>
        <button
          onClick={onBack}
          className="focus-ring"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            padding: "0",
            fontSize: "14px",
            color: "var(--color-text-body)",
            cursor: "pointer",
            marginBottom: "20px",
            fontWeight: 500,
            transition: "color 200ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-body)";
          }}
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Back
        </button>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Government Gateway credentials
        </h1>
        <p
          style={{ fontSize: "15px", color: "var(--color-text-body)", margin: 0, lineHeight: 1.6 }}
        >
          Enter your Government Gateway credentials to authorise the submission. These are used once
          to sign your return and are never stored.
        </p>
      </div>

      <div style={cardStyle}>
        {/* Security notice */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "14px 16px",
            backgroundColor: "var(--color-success-bg)",
            border: "1px solid var(--color-success-border)",
            borderRadius: "8px",
            marginBottom: "28px",
          }}
        >
          <span style={{ color: "var(--color-success)", flexShrink: 0, marginTop: "1px" }}>
            <Lock size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-success-text)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Your credentials are transmitted securely over HTTPS directly to HMRC. They are used
            only for this submission and are never stored or logged.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "28px" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                htmlFor="gatewayUsername"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                <span style={{ color: "var(--color-primary)" }}>
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
                <p
                  role="alert"
                  style={{ fontSize: "13px", color: "var(--color-danger)", margin: 0 }}
                >
                  {errors.username}
                </p>
              ) : (
                <p style={{ fontSize: "13px", color: "var(--color-text-body)", margin: 0 }}>
                  Your 12-digit Government Gateway User ID from HMRC.
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                htmlFor="gatewayPassword"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                <span style={{ color: "var(--color-primary)" }}>
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
                <p
                  role="alert"
                  style={{ fontSize: "13px", color: "var(--color-danger)", margin: 0 }}
                >
                  {errors.password}
                </p>
              ) : (
                <p style={{ fontSize: "13px", color: "var(--color-text-body)", margin: 0 }}>
                  The password associated with your Government Gateway account.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
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
          Submitting to HMRC
        </h1>
        <p
          style={{ fontSize: "15px", color: "var(--color-text-body)", margin: 0, lineHeight: 1.6 }}
        >
          Please wait while we securely submit your return.
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
              {"Submitting to HMRC\u2026"}
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
              "Building secure XML message",
              "Submitting to HMRC transaction engine",
              "Awaiting HMRC acknowledgement",
            ].map((step, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  color: "var(--color-text-body)",
                  animation: `filing-fade-in 400ms ease both`,
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
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--color-success-text)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                HMRC has accepted your nil CT600 return. A confirmation has been sent to your email
                address, and your next accounting period has been set up automatically.
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
                HMRC is still processing
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--color-warning-deep)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Your return has been submitted but HMRC has not yet confirmed the outcome. You can
                check the status from your dashboard - it may take a few more minutes.
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
            <p
              style={{
                fontSize: "15px",
                color: "var(--color-danger-text)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
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
