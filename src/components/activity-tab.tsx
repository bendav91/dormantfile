"use client";

import { useState } from "react";

interface ActivityTabProps {
  events: Array<{
    id: string;
    type: string;
    date: string;
    title: string;
    detail: string | null;
    filingType?: string;
  }>;
}

const DOT_COLORS: Record<string, string> = {
  company_added: "var(--color-primary)",
  filing_submitted: "var(--color-primary)",
  filing_accepted: "var(--color-success)",
  filing_rejected: "var(--color-danger)",
  filing_failed: "var(--color-danger)",
  reminder_sent: "var(--color-warning)",
};

const INITIAL_LIMIT = 20;

export default function ActivityTab({ events }: ActivityTabProps) {
  const [showAll, setShowAll] = useState(false);

  if (events.length === 0) {
    return (
      <p className="text-sm text-secondary text-center py-10">
        No activity yet
      </p>
    );
  }

  const visible = showAll ? events : events.slice(0, INITIAL_LIMIT);
  const hasMore = events.length > INITIAL_LIMIT;

  return (
    <div>
      <div className="border-l-2 border-border pl-6 ml-2">
        {visible.map((event) => (
          <div
            key={event.id}
            className="relative pb-6"
          >
            {/* Dot */}
            <div
              className="absolute -left-[31px] top-[2px] w-3 h-3 rounded-full border-2 border-page"
              style={{
                backgroundColor: DOT_COLORS[event.type] ?? "var(--color-text-muted)",
              }}
            />

            {/* Content */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-[13px] font-semibold text-foreground leading-4">
                  {event.title}
                </div>
                {event.detail && (
                  <div className="text-xs text-secondary mt-0.5 leading-4">
                    {event.detail}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted whitespace-nowrap shrink-0 leading-4">
                {event.date}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <div className="text-center pt-2">
          <button
            onClick={() => setShowAll(true)}
            className="text-[13px] font-semibold text-primary bg-transparent border-0 cursor-pointer px-4 py-2"
          >
            Show all ({events.length})
          </button>
        </div>
      )}
    </div>
  );
}
