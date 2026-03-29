"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Trash2, AlertTriangle, Building2, ArrowUpCircle } from "lucide-react";

interface SettingsActionsProps {
  hasSubscription: boolean;
  hasStripeCustomer: boolean;
  isAgentTier: boolean;
  filingAsAgent: boolean;
  companies: { id: string; name: string }[];
}

export default function SettingsActions({
  hasSubscription,
  hasStripeCustomer,
  isAgentTier,
  filingAsAgent,
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

  async function handleManageBilling() {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
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
              margin: "0 0 8px 0",
              letterSpacing: "-0.01em",
            }}
          >
            Billing
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 20px 0" }}>
            {hasSubscription
              ? "View invoices, update your payment method, or cancel your subscription."
              : "View your past invoices or resubscribe."}
          </p>
          <button
            onClick={handleManageBilling}
            className="focus-ring"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-bg-card)",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              transition: "opacity 200ms, transform 200ms, background-color 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            <CreditCard size={16} strokeWidth={2} />
            Manage billing
          </button>
          {hasSubscription && (
            <Link
              href="/choose-plan"
              className="focus-ring"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "transparent",
                color: "var(--color-primary)",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                border: "2px solid var(--color-primary)",
                textDecoration: "none",
                transition: "opacity 200ms, transform 200ms, background-color 200ms",
                marginLeft: "10px",
              }}
            >
              <ArrowUpCircle size={16} strokeWidth={2} />
              Change plan
            </Link>
          )}
        </div>
      )}

      {/* Filing mode section */}
      {isAgentTier && (
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
              margin: "0 0 8px 0",
              letterSpacing: "-0.01em",
            }}
          >
            Filing mode
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 20px 0" }}>
            {agentMode
              ? "You\u2019re filing as an agent on behalf of client companies. CT600 submissions will use your agent Government Gateway credentials."
              : "You\u2019re filing as a company director. CT600 submissions will use each company\u2019s own Government Gateway credentials."}
          </p>
          <button
            onClick={handleToggleAgentMode}
            disabled={savingAgentMode}
            className="focus-ring"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "transparent",
              color: "var(--color-primary)",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              border: "2px solid var(--color-primary)",
              cursor: savingAgentMode ? "not-allowed" : "pointer",
              opacity: savingAgentMode ? 0.6 : 1,
              transition: "opacity 200ms, transform 200ms, background-color 200ms",
            }}
          >
            {savingAgentMode
              ? "Saving\u2026"
              : agentMode
                ? "Switch to director mode"
                : "Switch to agent mode"}
          </button>
        </div>
      )}

      {/* Companies section */}
      {companies.length > 0 && (
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
              margin: "0 0 8px 0",
              letterSpacing: "-0.01em",
            }}
          >
            Companies
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 20px 0" }}>
            Remove a company to delete its filing history and reminders. Your account and
            subscription remain active.
          </p>

          {removeError && (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                backgroundColor: "var(--color-danger-bg)",
                border: "1px solid var(--color-danger-border)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "var(--color-danger)",
                marginBottom: "16px",
              }}
            >
              {removeError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {companies.map((company) => (
              <div
                key={company.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  backgroundColor: "var(--color-bg-page)",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "var(--color-primary)" }}>
                    <Building2 size={16} color="currentColor" strokeWidth={2} />
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {company.name}
                  </span>
                </div>

                {confirmRemoveId === company.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "var(--color-danger)" }}>Remove?</span>
                    <button
                      onClick={() => handleRemoveCompany(company.id)}
                      disabled={removingCompanyId === company.id}
                      className="focus-ring"
                      style={{
                        backgroundColor: "var(--color-danger)",
                        color: "var(--color-bg-card)",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        border: "none",
                        cursor: removingCompanyId === company.id ? "not-allowed" : "pointer",
                        transition: "opacity 200ms, transform 200ms, background-color 200ms",
                      }}
                    >
                      {removingCompanyId === company.id ? "\u2026" : "Yes"}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      disabled={removingCompanyId === company.id}
                      className="focus-ring"
                      style={{
                        backgroundColor: "transparent",
                        color: "var(--color-text-body)",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        border: "1px solid var(--color-bg-disabled)",
                        cursor: "pointer",
                        transition: "opacity 200ms, transform 200ms, background-color 200ms",
                      }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(company.id)}
                    className="focus-ring"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--color-danger)",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "13px",
                      border: "1px solid var(--color-danger-border)",
                      cursor: "pointer",
                      transition: "opacity 200ms, transform 200ms, background-color 200ms",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        "var(--color-danger-bg)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                    }}
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
      <div
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderRadius: "12px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          border: "1px solid var(--color-danger-border)",
        }}
      >
        <h2
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "var(--color-danger)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Danger zone
        </h2>
        <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 20px 0" }}>
          Permanently delete your account, all company data, and filing history.
          {hasSubscription && " Your subscription will be cancelled immediately."} This action
          cannot be undone.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              backgroundColor: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "8px",
              fontSize: "14px",
              color: "var(--color-danger)",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="focus-ring"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "transparent",
              color: "var(--color-danger)",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              border: "2px solid var(--color-danger)",
              cursor: "pointer",
              transition: "opacity 200ms, transform 200ms, background-color 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "var(--color-danger-bg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            <Trash2 size={16} strokeWidth={2} />
            Delete my account
          </button>
        ) : (
          <div
            style={{
              padding: "20px",
              backgroundColor: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <span style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: "1px" }}>
                <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
              </span>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-danger-text)",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                Are you sure? This will permanently delete your account,
                {companies.length > 0
                  ? ` ${companies.length} ${companies.length === 1 ? "company" : "companies"},`
                  : ""}{" "}
                and all filing records. Your subscription will be cancelled and you will be signed
                out.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="focus-ring"
                style={{
                  backgroundColor: deleting ? "var(--color-bg-disabled)" : "var(--color-danger)",
                  color: "var(--color-bg-card)",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  border: "none",
                  cursor: deleting ? "not-allowed" : "pointer",
                  transition: "opacity 200ms, transform 200ms, background-color 200ms",
                }}
              >
                {deleting ? "Deleting\u2026" : "Yes, delete everything"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="focus-ring"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--color-text-body)",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  border: "1px solid var(--color-bg-disabled)",
                  cursor: "pointer",
                  transition: "opacity 200ms, transform 200ms, background-color 200ms",
                }}
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
