"use client";

import { StarRating } from "@/components/marketing/StarRating";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewFormProps {
  isAuthenticated: boolean;
  existingReview?: {
    rating: number;
    text: string | null;
  } | null;
  userName?: string;
}

export function ReviewForm({ isAuthenticated, existingReview, userName }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [text, setText] = useState(existingReview?.text ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isEditing = !!existingReview;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    if (!isAuthenticated && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/reviews", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          text: text.trim() || null,
          ...(!isAuthenticated ? { name: name.trim() } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        id="form"
        className="bg-card border border-border rounded-xl p-8 text-center"
      >
        <p className="text-base font-semibold mb-1 text-foreground">
          {isAuthenticated ? "Thank you for your review!" : "Thank you! Your review has been submitted for approval."}
        </p>
        <p className="text-sm text-secondary">
          {isAuthenticated
            ? "Your review is now live."
            : "We\u2019ll publish it shortly after a quick review."}
        </p>
      </div>
    );
  }

  return (
    <form
      id="form"
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-xl p-8"
    >
      <h3 className="text-base font-semibold mb-1 text-foreground">
        {isEditing ? "Edit your review" : "Leave a review"}
      </h3>
      <p className="text-sm mb-5 text-secondary">
        {isAuthenticated
          ? isEditing
            ? "Update your rating or feedback below."
            : "How was your experience filing with DormantFile?"
          : "Used DormantFile? We\u2019d love to hear how it went."}
      </p>

      <div className="mb-5">
        <label className="text-sm font-medium mb-2 block text-foreground">
          Rating
        </label>
        <StarRating rating={rating} size={28} interactive onChange={setRating} />
      </div>

      {!isAuthenticated && (
        <div className="mb-4">
          <label
            htmlFor="review-name"
            className="text-sm font-medium mb-1.5 block text-foreground"
          >
            Your name
          </label>
          <input
            id="review-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full text-sm rounded-lg transition-colors duration-150 px-3 py-2.5 bg-inset border border-border text-foreground outline-none"
          />
        </div>
      )}

      <div className="mb-5">
        <label
          htmlFor="review-text"
          className="text-sm font-medium mb-1.5 block text-foreground"
        >
          Feedback <span className="text-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you think?"
          rows={3}
          maxLength={500}
          className="w-full text-sm rounded-lg transition-colors duration-150 resize-none px-3 py-2.5 bg-inset border border-border text-foreground outline-none"
        />
      </div>

      {error && (
        <p className="text-sm mb-4 text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-cta text-[#ffffff] py-2.5 px-6 border-none"
      >
        {loading
          ? "Submitting\u2026"
          : isEditing
            ? "Update review"
            : "Submit review"}
      </button>

      {isAuthenticated && userName && (
        <p className="text-xs mt-3 text-muted">
          Posting as {userName}
        </p>
      )}
    </form>
  );
}
