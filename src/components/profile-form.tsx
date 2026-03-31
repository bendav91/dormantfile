"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface ProfileFormProps {
  name: string;
  email: string;
  pendingEmail: string | null;
}

export default function ProfileForm({
  name: initialName,
  email: initialEmail,
  pendingEmail: initialPendingEmail,
}: ProfileFormProps) {
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-[0.05em] m-0 mb-1">Name</p>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className="text-[15px] text-foreground font-medium px-3 py-2 rounded-lg border border-border bg-page w-full max-w-[360px] outline-none"
        />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-[0.05em] m-0 mb-1">Email</p>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          className="text-[15px] text-foreground font-medium px-3 py-2 rounded-lg border border-border bg-page w-full max-w-[360px] outline-none"
        />
        {pendingEmail && (
          <p className="text-[13px] text-primary m-0 mt-1">
            Verification email sent to {pendingEmail}. Check your inbox.
          </p>
        )}
      </div>

      {error && (
        <p className="text-[13px] text-danger m-0">{error}</p>
      )}

      {hasChanges && (
        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "focus-ring bg-primary text-card px-[18px] py-2 rounded-lg font-semibold text-sm border-0 transition-opacity duration-200",
              saving ? "cursor-not-allowed opacity-60" : "cursor-pointer opacity-100"
            )}
          >
            {saving ? "Saving\u2026" : "Save changes"}
          </button>
        </div>
      )}

      {saved && !hasChanges && (
        <p className="text-[13px] text-success m-0">Changes saved.</p>
      )}
    </div>
  );
}
