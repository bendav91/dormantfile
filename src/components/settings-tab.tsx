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
  firstPeriodStart: string; // ISO date string — CH accounting period start to use as default
}

export default function SettingsTab({
  companyId,
  companyName,
  registeredForCorpTax,
  uniqueTaxReference,
  shareCapital,
  activeCT600Count,
  firstPeriodStart,
}: SettingsTabProps) {
  const router = useRouter();
  const [showEnableForm, setShowEnableForm] = useState(false);
  const [utrInput, setUtrInput] = useState("");
  const [ctapStartInput, setCtapStartInput] = useState(firstPeriodStart?.split("T")[0] ?? "");
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
      { companyId, registeredForCorpTax: true, uniqueTaxReference: utrInput.trim(), ctapStartDate: ctapStartInput || undefined },
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
    await handleApiCall("/api/company/remove", "DELETE", { companyId }, () => {
      router.push("/dashboard");
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {/* Corporation Tax row */}
        {!registeredForCorpTax && !showEnableForm && (
          <div className="flex items-center justify-between px-4 py-3.5 bg-inset rounded-lg">
            <p className="text-[13px] font-semibold text-foreground m-0">Corporation Tax</p>
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-secondary m-0">Not enabled</p>
              <button
                onClick={() => setShowEnableForm(true)}
                className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-primary"
              >
                Enable CT600
              </button>
            </div>
          </div>
        )}

        {!registeredForCorpTax && showEnableForm && (
          <div className="flex flex-col items-stretch gap-3 px-4 py-3.5 bg-inset rounded-lg">
            <p className="text-[13px] font-semibold text-foreground m-0">Enable Corporation Tax</p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Unique Tax Reference (UTR)"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                className="flex-1 px-2.5 py-2 text-[13px] border border-border rounded-md bg-card text-foreground"
              />
              <input
                type="date"
                value={ctapStartInput}
                onChange={(e) => setCtapStartInput(e.target.value)}
                className="flex-1 px-2.5 py-2 text-[13px] border border-border rounded-md bg-card text-foreground"
              />
              <p className="text-xs text-secondary m-0">
                CT accounting period start date. Usually matches your accounts period start. If unsure, check your HMRC Business Tax Account or CT41G letter.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEnableCorpTax}
                  disabled={saving}
                  className="bg-transparent border-0 px-3.5 py-2 text-xs font-semibold cursor-pointer rounded text-primary"
                >
                  {saving ? "Saving\u2026" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowEnableForm(false);
                    setUtrInput("");
                  }}
                  disabled={saving}
                  className="bg-transparent border-0 px-3.5 py-2 text-xs font-semibold cursor-pointer rounded text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {registeredForCorpTax && (
          <div className="flex items-center justify-between px-4 py-3.5 bg-inset rounded-lg">
            <p className="text-[13px] font-semibold text-foreground m-0">Corporation Tax</p>
            <div className="flex items-center gap-2">
              {editingUTR ? (
                <>
                  <input
                    type="text"
                    value={editUTRInput}
                    onChange={(e) => setEditUTRInput(e.target.value)}
                    className="px-2.5 py-1.5 text-[13px] border border-border rounded-md bg-card text-foreground w-[160px]"
                  />
                  <button
                    onClick={handleEditUTR}
                    disabled={saving}
                    title="Save"
                    className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-primary"
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingUTR(false);
                      setEditUTRInput(uniqueTaxReference ?? "");
                    }}
                    disabled={saving}
                    title="Cancel"
                    className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-secondary"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-secondary m-0">{uniqueTaxReference || "No UTR set"}</p>
                  <button
                    onClick={() => setEditingUTR(true)}
                    title="Edit UTR"
                    className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-primary"
                  >
                    <Pencil size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(true)}
                    title="Remove Corp Tax"
                    className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-danger"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Share Capital row */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-inset rounded-lg">
          <p className="text-[13px] font-semibold text-foreground m-0">Share Capital</p>
          <div className="flex items-center gap-2">
            {editingShareCapital ? (
              <>
                <span className="text-[13px] text-secondary">&pound;</span>
                <input
                  type="text"
                  value={shareCapitalInput}
                  onChange={(e) => setShareCapitalInput(e.target.value)}
                  className="px-2.5 py-1.5 text-[13px] border border-border rounded-md bg-card text-foreground w-[100px]"
                />
                <button
                  onClick={handleSaveShareCapital}
                  disabled={saving}
                  title="Save"
                  className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-primary"
                >
                  <Check size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => {
                    setEditingShareCapital(false);
                    setShareCapitalInput((shareCapital / 100).toFixed(2));
                  }}
                  disabled={saving}
                  title="Cancel"
                  className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-secondary"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-secondary m-0">&pound;{(shareCapital / 100).toFixed(2)}</p>
                <button
                  onClick={() => setEditingShareCapital(true)}
                  title="Edit share capital"
                  className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-primary"
                >
                  <Pencil size={13} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-8 pt-5 border-t border-border">
        <h3 className="text-sm font-semibold text-danger m-0 mb-3">
          Danger zone
        </h3>
        <div className="flex items-center justify-between px-4 py-3.5 bg-inset rounded-lg">
          <div>
            <p className="text-[13px] font-semibold text-foreground m-0">Remove company</p>
            <p className="text-[13px] text-secondary m-0 text-xs">
              This will remove the company from your account. Filing history is preserved.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-transparent border-0 px-2 py-1 text-xs font-semibold cursor-pointer rounded text-danger"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <p className="text-[13px] text-danger mt-3">{error}</p>
      )}

      {/* Remove Corp Tax confirmation modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-5 max-w-[420px] w-[calc(100%-32px)] shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <h3 className="text-base font-bold text-foreground m-0 mb-3">
              Disable Corporation Tax?
            </h3>
            <p className="text-sm text-body m-0 mb-5 leading-relaxed">
              {activeCT600Count > 0
                ? `You have ${activeCT600Count} CT600 filing${activeCT600Count === 1 ? "" : "s"} in progress. They will continue to be processed, but you won't be able to start new CT600 filings. Are you sure?`
                : "This will remove Corporation Tax filing for this company. You can re-enable it later. Are you sure?"}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={saving}
                className="bg-transparent border border-border px-4 py-2 text-xs font-semibold cursor-pointer rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableCorpTax}
                disabled={saving}
                className="bg-danger text-white px-4 py-2 text-xs font-semibold cursor-pointer rounded-md border-0"
              >
                {saving ? "Saving\u2026" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete company confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-5 max-w-[420px] w-[calc(100%-32px)] shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <h3 className="text-base font-bold text-foreground m-0 mb-3">
              Remove company?
            </h3>
            <p className="text-sm text-body m-0 mb-5 leading-relaxed">
              This will remove {companyName} from your account. Your filing history will be
              preserved. Are you sure?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                className="bg-transparent border border-border px-4 py-2 text-xs font-semibold cursor-pointer rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={saving}
                className="bg-danger text-white px-4 py-2 text-xs font-semibold cursor-pointer rounded-md border-0"
              >
                {saving ? "Removing\u2026" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
