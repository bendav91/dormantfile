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
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          textAlign: "center",
          padding: "40px 0",
        }}
      >
        No activity yet
      </p>
    );
  }

  const visible = showAll ? events : events.slice(0, INITIAL_LIMIT);
  const hasMore = events.length > INITIAL_LIMIT;

  return (
    <div>
      <div
        style={{
          borderLeft: "2px solid var(--color-border)",
          paddingLeft: "24px",
          marginLeft: "8px",
        }}
      >
        {visible.map((event) => (
          <div
            key={event.id}
            style={{
              position: "relative",
              paddingBottom: "24px",
            }}
          >
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: "-31px",
                top: "2px",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: DOT_COLORS[event.type] ?? "var(--color-text-muted)",
                border: "2px solid var(--color-bg)",
              }}
            />

            {/* Content */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    lineHeight: "16px",
                  }}
                >
                  {event.title}
                </div>
                {event.detail && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                      marginTop: "2px",
                      lineHeight: "16px",
                    }}
                  >
                    {event.detail}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  lineHeight: "16px",
                }}
              >
                {event.date}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <div style={{ textAlign: "center", paddingTop: "8px" }}>
          <button
            onClick={() => setShowAll(true)}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 16px",
            }}
          >
            Show all ({events.length})
          </button>
        </div>
      )}
    </div>
  );
}
