"use client";

import { StarRating } from "@/components/marketing/StarRating";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const DISMISS_KEY = "dismissed_review_prompt";

export function ReviewPrompt() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  function handleRatingSelect(value: number) {
    setRating(value);
    setExpanded(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text: text.trim() || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setSubmitted(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (dismissed) return null;

  if (submitted) {
    return (
      <div
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
          Thank you for your review!
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            How was your experience filing with DormantFile?
          </p>
          <StarRating rating={rating} size={24} interactive onChange={handleRatingSelect} />
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="cursor-pointer"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            padding: "4px",
            lineHeight: 0,
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us more (optional)"
            rows={2}
            maxLength={500}
            className="w-full text-sm rounded-lg resize-none mb-3"
            style={{
              padding: "10px 12px",
              backgroundColor: "var(--color-bg-inset)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />

          {error && (
            <p className="text-sm mb-3" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "#ffffff",
                padding: "8px 20px",
                border: "none",
              }}
            >
              {loading ? "Submitting\u2026" : "Submit review"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-sm cursor-pointer"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                padding: "8px",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
