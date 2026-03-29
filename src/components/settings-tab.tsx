"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check } from "lucide-react";

interface SettingsTabProps {
  companyId: string;
  companyName: string;
  registeredForCorpTax: boolean;
  uniqueTaxReference: string | null;
  shareCapital: number; // in pence
  activeCT600Count: number; // count of CT600 filings with status submitted/pending/polling_timeout
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  backgroundColor: "var(--color-bg-inset)",
  borderRadius: "8px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-text-primary)",
  margin: 0,
};

const valueStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--color-text-secondary)",
  margin: 0,
};

const actionBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: "4px 8px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: "4px",
};

export default function SettingsTab({
  companyId,
  companyName,
  registeredForCorpTax,
  uniqueTaxReference,
  shareCapital,
  activeCT600Count,
}: SettingsTabProps) {
  const router = useRouter();
  const [showEnableForm, setShowEnableForm] = useState(false);
  const [utrInput, setUtrInput] = useState("");
  const [editingUTR, setEditingUTR] = useState(false);
  const [editUTRInput, setEditUTRInput] = useState(uniqueTaxReference ?? "");
  const [editingShareCapital, setEditingShareCapital] = useState(false);
  const [shareCapitalInput, setShareCapitalInput] = useState((shareCapital / 100).toFixed(2));
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleApiCall(
    url: string,
    method: string,
    body: Record<string, unknown>,
    onSuccess: () => void,
  ) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "An error occurred");
        setSaving(false);
        return;
      }
      setSaving(false);
      onSuccess();
    } catch {
      setError("An unexpected error occurred");
      setSaving(false);
    }
  }

  async function handleEnableCorpTax() {
    await handleApiCall(
      "/api/company/update",
      "PATCH",
      { companyId, registeredForCorpTax: true, uniqueTaxReference: utrInput.trim() },
      () => {
        setShowEnableForm(false);
        router.refresh();
      },
    );
  }

  async function handleEditUTR() {
    await handleApiCall(
      "/api/company/update",
      "PATCH",
      { companyId, uniqueTaxReference: editUTRInput.trim() },
      () => {
        setEditingUTR(false);
        router.refresh();
      },
    );
  }

  async function handleDisableCorpTax() {
    await handleApiCall(
      "/api/company/update",
      "PATCH",
      { companyId, registeredForCorpTax: false },
      () => {
        setShowRemoveConfirm(false);
        router.refresh();
      },
    );
  }

  async function handleSaveShareCapital() {
    const parsed = parseFloat(shareCapitalInput);
    if (isNaN(parsed)) {
      setError("Please enter a valid share capital amount");
      return;
    }
    await handleApiCall(
      "/api/company/update",
      "PATCH",
      { companyId, shareCapital: Math.round(parsed * 100) },
      () => {
        setEditingShareCapital(false);
        router.refresh();
      },
    );
  }

  async function handleDeleteCompany() {
    await handleApiCall(
      "/api/company/remove",
      "DELETE",
      { companyId },
      () => {
        router.push("/dashboard");
      },
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

        {/* Corporation Tax row */}
        {!registeredForCorpTax && !showEnableForm && (
          <div style={rowStyle}>
            <p style={labelStyle}>Corporation Tax</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p style={valueStyle}>Not enabled</p>
              <button
                onClick={() => setShowEnableForm(true)}
                style={{ ...actionBtnStyle, color: "var(--color-primary)" }}
              >
                Enable CT600
              </button>
            </div>
          </div>
        )}

        {!registeredForCorpTax && showEnableForm && (
          <div style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: "12px" }}>
            <p style={labelStyle}>Enable Corporation Tax</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="text"
                placeholder="Unique Tax Reference (UTR)"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  backgroundColor: "var(--color-bg-card)",
                  color: "var(--color-text-primary)",
                }}
              />
              <button
                onClick={handleEnableCorpTax}
                disabled={saving}
                style={{ ...actionBtnStyle, color: "var(--color-primary)", padding: "8px 14px" }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setShowEnableForm(false); setUtrInput(""); }}
                disabled={saving}
                style={{ ...actionBtnStyle, color: "var(--color-text-secondary)", padding: "8px 14px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {registeredForCorpTax && (
          <div style={rowStyle}>
            <p style={labelStyle}>Corporation Tax</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {editingUTR ? (
                <>
                  <input
                    type="text"
                    value={editUTRInput}
                    onChange={(e) => setEditUTRInput(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      fontSize: "13px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "6px",
                      backgroundColor: "var(--color-bg-card)",
                      color: "var(--color-text-primary)",
                      width: "160px",
                    }}
                  />
                  <button
                    onClick={handleEditUTR}
                    disabled={saving}
                    title="Save"
                    style={{ ...actionBtnStyle, color: "var(--color-primary)" }}
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => { setEditingUTR(false); setEditUTRInput(uniqueTaxReference ?? ""); }}
                    disabled={saving}
                    title="Cancel"
                    style={{ ...actionBtnStyle, color: "var(--color-text-secondary)" }}
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  <p style={valueStyle}>{uniqueTaxReference || "No UTR set"}</p>
                  <button
                    onClick={() => setEditingUTR(true)}
                    title="Edit UTR"
                    style={{ ...actionBtnStyle, color: "var(--color-primary)" }}
                  >
                    <Pencil size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(true)}
                    title="Remove Corp Tax"
                    style={{ ...actionBtnStyle, color: "var(--color-danger)" }}
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Share Capital row */}
        <div style={rowStyle}>
          <p style={labelStyle}>Share Capital</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {editingShareCapital ? (
              <>
                <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>£</span>
                <input
                  type="text"
                  value={shareCapitalInput}
                  onChange={(e) => setShareCapitalInput(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "13px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    backgroundColor: "var(--color-bg-card)",
                    color: "var(--color-text-primary)",
                    width: "100px",
                  }}
                />
                <button
                  onClick={handleSaveShareCapital}
                  disabled={saving}
                  title="Save"
                  style={{ ...actionBtnStyle, color: "var(--color-primary)" }}
                >
                  <Check size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => { setEditingShareCapital(false); setShareCapitalInput((shareCapital / 100).toFixed(2)); }}
                  disabled={saving}
                  title="Cancel"
                  style={{ ...actionBtnStyle, color: "var(--color-text-secondary)" }}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </>
            ) : (
              <>
                <p style={valueStyle}>£{(shareCapital / 100).toFixed(2)}</p>
                <button
                  onClick={() => setEditingShareCapital(true)}
                  title="Edit share capital"
                  style={{ ...actionBtnStyle, color: "var(--color-primary)" }}
                >
                  <Pencil size={13} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--color-border)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-danger)", margin: "0 0 12px 0" }}>
          Danger zone
        </h3>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>Remove company</p>
            <p style={{ ...valueStyle, fontSize: "12px" }}>
              This will remove the company from your account. Filing history is preserved.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...actionBtnStyle, color: "var(--color-danger)" }}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <p style={{ fontSize: "13px", color: "var(--color-danger)", marginTop: "12px" }}>
          {error}
        </p>
      )}

      {/* Remove Corp Tax confirmation modal */}
      {showRemoveConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg-card)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 12px 0" }}>
              Disable Corporation Tax?
            </h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              {activeCT600Count > 0
                ? `You have ${activeCT600Count} CT600 filing${activeCT600Count === 1 ? "" : "s"} in progress. They will continue to be processed, but you won't be able to start new CT600 filings. Are you sure?`
                : "This will remove Corporation Tax filing for this company. You can re-enable it later. Are you sure?"}
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={saving}
                style={{ ...actionBtnStyle, border: "1px solid var(--color-border)", padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDisableCorpTax}
                disabled={saving}
                style={{
                  ...actionBtnStyle,
                  backgroundColor: "var(--color-danger)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "6px",
                }}
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete company confirmation modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg-card)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 12px 0" }}>
              Remove company?
            </h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              This will remove {companyName} from your account. Your filing history will be preserved. Are you sure?
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                style={{ ...actionBtnStyle, border: "1px solid var(--color-border)", padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={saving}
                style={{
                  ...actionBtnStyle,
                  backgroundColor: "var(--color-danger)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "6px",
                }}
              >
                {saving ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
