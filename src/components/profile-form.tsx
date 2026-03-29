"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  name: string;
  email: string;
  pendingEmail: string | null;
}

export default function ProfileForm({ name: initialName, email: initialEmail, pendingEmail: initialPendingEmail }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(initialPendingEmail);

  const hasChanges = name !== initialName || email !== initialEmail;

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/account/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save changes.");
        return;
      }

      if (data.pendingEmail) {
        setPendingEmail(data.pendingEmail);
        setEmail(initialEmail);
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 4px 0",
  };

  const inputStyle: React.CSSProperties = {
    fontSize: "15px",
    color: "var(--color-text-primary)",
    fontWeight: 500,
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-bg-page)",
    width: "100%",
    maxWidth: "360px",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <p style={labelStyle}>Name</p>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          style={inputStyle}
        />
      </div>
      <div>
        <p style={labelStyle}>Email</p>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          style={inputStyle}
        />
        {pendingEmail && (
          <p style={{ fontSize: "13px", color: "var(--color-primary)", margin: "4px 0 0 0" }}>
            Verification email sent to {pendingEmail}. Check your inbox.
          </p>
        )}
      </div>

      {error && (
        <p style={{ fontSize: "13px", color: "var(--color-danger)", margin: 0 }}>{error}</p>
      )}

      {hasChanges && (
        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="focus-ring"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-bg-card)",
              padding: "8px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              transition: "opacity 200ms",
            }}
          >
            {saving ? "Saving\u2026" : "Save changes"}
          </button>
        </div>
      )}

      {saved && !hasChanges && (
        <p style={{ fontSize: "13px", color: "var(--color-success)", margin: 0 }}>Changes saved.</p>
      )}
    </div>
  );
}
