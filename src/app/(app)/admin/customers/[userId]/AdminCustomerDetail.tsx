"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StarRating } from "@/components/marketing/StarRating";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface Filing {
  id: string;
  filingType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  deadline: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  hasCorrelationId: boolean;
}

interface Company {
  id: string;
  companyName: string;
  crn: string;
  isDeleted: boolean;
  filings: Filing[];
}

interface Review {
  id: string;
  rating: number;
  name: string;
  text: string | null;
  verified: boolean;
  approved: boolean;
  hiddenAt: string | null;
  createdAt: string;
}

interface AdminCustomerDetailProps {
  companies: Company[];
  review: Review | null;
}

export function AdminCustomerDetail({ companies, review }: AdminCustomerDetailProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  function toggleCompany(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFilingAction(filingId: string, action: "retry" | "reset") {
    setLoading(filingId);
    try {
      const res = await fetch("/api/admin/filings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: filingId, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReviewAction(reviewId: string, action: "approve" | "hide" | "unhide") {
    setLoading(reviewId);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewId, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      {/* Companies */}
      <h3 className="text-sm font-semibold mb-3 text-foreground">
        Companies ({companies.length})
      </h3>
      <div className="space-y-2 mb-8">
        {companies.map((company) => {
          const isOpen = expanded.has(company.id);
          return (
            <div
              key={company.id}
              className={cn(
                "rounded-xl overflow-hidden bg-card border border-border",
                company.isDeleted && "opacity-50"
              )}
            >
              <button
                onClick={() => toggleCompany(company.id)}
                className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left bg-transparent border-0"
              >
                {isOpen ? (
                  <ChevronDown size={14} className="text-muted" />
                ) : (
                  <ChevronRight size={14} className="text-muted" />
                )}
                <span className="text-sm font-medium flex-1 text-foreground">
                  {company.companyName}
                  {company.isDeleted && " (deleted)"}
                </span>
                <span className="text-xs text-muted">
                  {company.crn}
                </span>
                <span className="text-xs text-muted">
                  {company.filings.length} filings
                </span>
              </button>

              {isOpen && company.filings.length > 0 && (
                <div className="border-t border-border">
                  {company.filings.map((filing) => {
                    const deadline = filing.deadline;
                    const isOverdue = deadline && new Date(deadline) < new Date() && filing.status === "outstanding";
                    const canRetry = filing.status === "submitted" || (filing.status === "failed" && filing.hasCorrelationId);
                    const canReset = filing.status === "rejected" || filing.status === "failed";

                    return (
                      <div
                        key={filing.id}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs border-b border-border"
                      >
                        <StatusBadge status={filing.filingType} label={filing.filingType === "ct600" ? "CT600" : "Accounts"} />
                        <span className="text-body">
                          {fmt(filing.periodStart)} — {fmt(filing.periodEnd)}
                        </span>
                        <StatusBadge status={filing.status} />
                        {deadline && (
                          <span className={isOverdue ? "text-danger" : "text-muted"}>
                            Due {fmt(deadline)}
                          </span>
                        )}
                        {filing.submittedAt && (
                          <span className="text-muted">
                            Submitted {fmt(filing.submittedAt)}
                          </span>
                        )}
                        <div className="ml-auto flex gap-1">
                          {canRetry && (
                            <button
                              onClick={() => handleFilingAction(filing.id, "retry")}
                              disabled={loading === filing.id}
                              className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50 text-primary border border-primary-border bg-primary-bg"
                            >
                              Retry
                            </button>
                          )}
                          {canReset && (
                            <button
                              onClick={() => handleFilingAction(filing.id, "reset")}
                              disabled={loading === filing.id}
                              className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50 text-secondary border border-border bg-transparent"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Review */}
      {review && (
        <>
          <h3 className="text-sm font-semibold mb-3 text-foreground">
            Review
          </h3>
          <div className="p-4 rounded-xl mb-8 bg-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={review.rating} size={14} />
              <StatusBadge status={review.hiddenAt ? "hidden" : review.approved ? "published" : "pending"} />
            </div>
            {review.text && (
              <p className="text-sm mb-2 text-body">{review.text}</p>
            )}
            <div className="flex gap-2 mt-3">
              {!review.approved && !review.hiddenAt && (
                <button
                  onClick={() => handleReviewAction(review.id, "approve")}
                  disabled={loading === review.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 bg-success-bg text-success border border-success-border"
                >
                  Approve
                </button>
              )}
              {!review.hiddenAt ? (
                <button
                  onClick={() => handleReviewAction(review.id, "hide")}
                  disabled={loading === review.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 bg-danger-bg text-danger border border-danger-border"
                >
                  Hide
                </button>
              ) : (
                <button
                  onClick={() => handleReviewAction(review.id, "unhide")}
                  disabled={loading === review.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 text-secondary border border-border bg-transparent"
                >
                  Unhide
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
