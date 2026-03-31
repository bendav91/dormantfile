"use client";

import { useState } from "react";
import { Copy, Check, Calendar, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/cn";

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
    <div className="bg-card rounded-xl p-7 shadow-md mb-6">
      <h2 className="text-[17px] font-bold text-foreground m-0 mb-2 tracking-[-0.01em]">
        Calendar feed
      </h2>
      <p className="text-sm text-body m-0 mb-5">
        Subscribe to your filing deadlines in Google Calendar, Outlook, or any calendar app.
      </p>

      {token ? (
        <div>
          <div className="flex gap-2 items-center mb-3">
            <input
              type="text"
              readOnly
              value={getFeedUrl()}
              className="flex-1 font-mono text-xs px-3 py-2.5 rounded-lg border border-border bg-page text-foreground outline-none min-w-0"
            />
            <button
              onClick={handleCopy}
              className="focus-ring inline-flex items-center gap-1.5 bg-primary text-card px-4 py-2.5 rounded-lg font-semibold text-[13px] border-0 cursor-pointer transition-all duration-200 shrink-0 hover:opacity-90 hover:-translate-y-px"
              title="Copy URL"
            >
              {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
              {copied ? "Copied" : "Copy URL"}
            </button>
          </div>
          <div className="flex gap-4 items-center">
            {confirmRegen ? (
              <span className="flex items-center gap-2">
                <span className="text-[13px] text-body">
                  This will break existing subscriptions. Continue?
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className={cn(
                    "focus-ring bg-transparent text-primary px-3 py-1 rounded-md font-semibold text-[13px] border border-primary transition-opacity duration-200",
                    loading ? "cursor-not-allowed opacity-60" : "cursor-pointer opacity-100"
                  )}
                >
                  {loading ? "Regenerating\u2026" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="focus-ring bg-transparent text-body px-3 py-1 rounded-md font-semibold text-[13px] border border-disabled cursor-pointer transition-opacity duration-200"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmRegen(true)}
                className="focus-ring inline-flex items-center gap-[5px] bg-transparent text-secondary p-0 border-0 cursor-pointer text-[13px] font-medium transition-colors duration-200 hover:text-foreground"
              >
                <RefreshCw size={13} strokeWidth={2} />
                Regenerate
              </button>
            )}
            <button
              onClick={handleRevoke}
              disabled={loading}
              className={cn(
                "focus-ring inline-flex items-center gap-[5px] bg-transparent text-danger p-0 border-0 text-[13px] font-medium transition-all duration-200 hover:opacity-70",
                loading ? "cursor-not-allowed opacity-60" : "cursor-pointer opacity-100"
              )}
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
          className={cn(
            "focus-ring inline-flex items-center gap-2 bg-primary text-card px-5 py-2.5 rounded-lg font-semibold text-sm border-0 transition-all duration-200 hover:opacity-90 hover:-translate-y-px",
            loading ? "cursor-not-allowed opacity-60" : "cursor-pointer opacity-100"
          )}
        >
          <Calendar size={16} strokeWidth={2} />
          {loading ? "Generating\u2026" : "Generate feed URL"}
        </button>
      )}
    </div>
  );
}
