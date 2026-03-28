"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Trash2, AlertTriangle, Building2, ArrowUpCircle } from "lucide-react";

interface SettingsActionsProps {
  hasSubscription: boolean;
  hasStripeCustomer: boolean;
  companies: { id: string; name: string }[];
}

export default function SettingsActions({ hasSubscription, hasStripeCustomer, companies }: SettingsActionsProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [removingCompanyId, setRemovingCompanyId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  async function handleManageBilling() {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
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
            backgroundColor: "#ffffff",
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
              color: "#1E293B",
              margin: "0 0 8px 0",
              letterSpacing: "-0.01em",
            }}
          >
            Billing
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 20px 0" }}>
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
              backgroundColor: "#2563EB",
              color: "#ffffff",
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
                color: "#2563EB",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                border: "2px solid #2563EB",
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

      {/* Companies section */}
      {companies.length > 0 && (
        <div
          style={{
            backgroundColor: "#ffffff",
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
              color: "#1E293B",
              margin: "0 0 8px 0",
              letterSpacing: "-0.01em",
            }}
          >
            Companies
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 20px 0" }}>
            Remove a company to delete its filing history and reminders. Your account and subscription remain active.
          </p>

          {removeError && (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#DC2626",
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
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Building2 size={16} color="#2563EB" strokeWidth={2} />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#1E293B" }}>
                    {company.name}
                  </span>
                </div>

                {confirmRemoveId === company.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#DC2626" }}>Remove?</span>
                    <button
                      onClick={() => handleRemoveCompany(company.id)}
                      disabled={removingCompanyId === company.id}
                      className="focus-ring"
                      style={{
                        backgroundColor: "#DC2626",
                        color: "#ffffff",
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
                        color: "#64748B",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        border: "1px solid #CBD5E1",
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
                      color: "#DC2626",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "13px",
                      border: "1px solid #FECACA",
                      cursor: "pointer",
                      transition: "opacity 200ms, transform 200ms, background-color 200ms",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FEF2F2";
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
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          border: "1px solid #FECACA",
        }}
      >
        <h2
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "#DC2626",
            margin: "0 0 8px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Danger zone
        </h2>
        <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 20px 0" }}>
          Permanently delete your account, all company data, and filing history.
          {hasSubscription && " Your subscription will be cancelled immediately."}
          {" "}This action cannot be undone.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#DC2626",
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
              color: "#DC2626",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              border: "2px solid #DC2626",
              cursor: "pointer",
              transition: "opacity 200ms, transform 200ms, background-color 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FEF2F2";
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
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px" }}>
              <AlertTriangle size={18} color="#DC2626" strokeWidth={2} style={{ flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "14px", color: "#7F1D1D", margin: 0, lineHeight: "1.5" }}>
                Are you sure? This will permanently delete your account,
                {companies.length > 0 ? ` ${companies.length} ${companies.length === 1 ? "company" : "companies"},` : ""}
                {" "}and all filing records. Your subscription will be
                cancelled and you will be signed out.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="focus-ring"
                style={{
                  backgroundColor: deleting ? "#CBD5E1" : "#DC2626",
                  color: "#ffffff",
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
                  color: "#475569",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  border: "1px solid #CBD5E1",
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
