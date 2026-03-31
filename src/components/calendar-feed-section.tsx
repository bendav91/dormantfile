"use client";

import { useState } from "react";
import { Copy, Check, Calendar, RefreshCw, X } from "lucide-react";

interface CalendarFeedSectionProps {
  initialToken: string | null;
}

export default function CalendarFeedSection({ initialToken }: CalendarFeedSectionProps) {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  function getFeedUrl() {
    if (!token) return "";
    return `${window.location.origin}/api/calendar/feed?token=${token}`;
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/token", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setConfirmRegen(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/token", { method: "DELETE" });
      if (res.ok) {
        setToken(null);
        setConfirmRegen(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getFeedUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API requires secure context
    }
  }

  return (
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
        Calendar feed
      </h2>
      <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 20px 0" }}>
        Subscribe to your filing deadlines in Google Calendar, Outlook, or any calendar app.
      </p>

      {token ? (
        <div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
            <input
              type="text"
              readOnly
              value={getFeedUrl()}
              style={{
                flex: 1,
                fontFamily: "monospace",
                fontSize: "12px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-page)",
                color: "var(--color-text-primary)",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              onClick={handleCopy}
              className="focus-ring"
              title="Copy URL"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-bg-card)",
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
                transition: "opacity 200ms, transform 200ms",
                flexShrink: 0,
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
              {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
              {copied ? "Copied" : "Copy URL"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {confirmRegen ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "var(--color-text-body)" }}>
                  This will break existing subscriptions. Continue?
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="focus-ring"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--color-primary)",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "13px",
                    border: "1px solid var(--color-primary)",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    transition: "opacity 200ms",
                  }}
                >
                  {loading ? "Regenerating\u2026" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="focus-ring"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--color-text-body)",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "13px",
                    border: "1px solid var(--color-bg-disabled)",
                    cursor: "pointer",
                    transition: "opacity 200ms",
                  }}
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmRegen(true)}
                className="focus-ring"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  backgroundColor: "transparent",
                  color: "var(--color-text-secondary)",
                  padding: 0,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  transition: "color 200ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-secondary)";
                }}
              >
                <RefreshCw size={13} strokeWidth={2} />
                Regenerate
              </button>
            )}
            <button
              onClick={handleRevoke}
              disabled={loading}
              className="focus-ring"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "transparent",
                color: "var(--color-danger)",
                padding: 0,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: 500,
                opacity: loading ? 0.6 : 1,
                transition: "color 200ms, opacity 200ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = loading ? "0.6" : "1";
              }}
            >
              <X size={13} strokeWidth={2} />
              Revoke
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
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
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "opacity 200ms, transform 200ms, background-color 200ms",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = loading ? "0.6" : "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          <Calendar size={16} strokeWidth={2} />
          {loading ? "Generating\u2026" : "Generate feed URL"}
        </button>
      )}
    </div>
  );
}
