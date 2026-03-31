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
      <div className="bg-card border border-border rounded-xl px-6 py-5 mb-6">
        <p className="text-sm font-medium text-success">
          Thank you for your review!
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-xl px-6 py-5 mb-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold mb-2 text-foreground">
            How was your experience filing with DormantFile?
          </p>
          <StarRating rating={rating} size={24} interactive onChange={handleRatingSelect} />
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="cursor-pointer bg-transparent border-none text-muted p-1 leading-none shrink-0"
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
            className="w-full text-sm rounded-lg resize-none mb-3 px-3 py-2.5 bg-inset border border-border text-foreground outline-none"
          />

          {error && (
            <p className="text-sm mb-3 text-danger">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50 bg-cta text-[#ffffff] py-2 px-5 border-none"
            >
              {loading ? "Submitting\u2026" : "Submit review"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-sm cursor-pointer bg-transparent border-none text-muted p-2"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
