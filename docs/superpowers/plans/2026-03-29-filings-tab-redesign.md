# Filings Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Outstanding/Completed sub-tabs to the FilingsTab component with detailed filing history in the Completed view.

**Architecture:** Convert FilingsTab to a client component with `useState` for sub-tab selection. Outstanding tab keeps existing period cards unchanged. Completed tab shows rich period cards with per-filing detail (status badge, confirmed date, source hint). Segment control styled as pill toggle above content.

**Tech Stack:** React 19 (client component), Next.js App Router, inline styles with CSS custom properties, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-03-29-filings-tab-redesign.md`

---

### Task 1: Extend Filing interface and add client directive

**Files:**

- Modify: `src/components/filings-tab.tsx:1-31`

- [ ] **Step 1: Add `"use client"` directive and extend Filing interface**

At the top of the file, add the `"use client"` directive. Then add `confirmedAt` and `submittedAt` to the local `Filing` interface, and import `useState`:

```tsx
"use client";

import { useState } from "react";
import FilingStatusBadge from "@/components/filing-status-badge";
import MarkFiledButton from "@/components/mark-filed-button";
import { type PeriodInfo } from "@/lib/periods";
import { FilingStatus } from "@prisma/client";
import { AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// ... existing helpers ...

interface Filing {
  id: string;
  filingType: string;
  periodStart: Date;
  periodEnd: Date;
  status: FilingStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  submittedAt: Date | null;
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `npm run build`
Expected: Build succeeds — the parent page already passes all Filing fields from Prisma, so the extended interface is satisfied.

- [ ] **Step 3: Commit**

```bash
git add src/components/filings-tab.tsx
git commit -m "refactor: convert FilingsTab to client component and extend Filing interface"
```

---

### Task 2: Add segment control sub-tab bar

**Files:**

- Modify: `src/components/filings-tab.tsx`

- [ ] **Step 1: Add sub-tab state and render segment control**

Inside the `FilingsTab` component, add state and render the segment control just after the disclosure territory warning (before the outstanding periods `<div>`):

```tsx
const [activeTab, setActiveTab] = useState<"outstanding" | "completed">("outstanding");

// Segment control styles
const segmentContainerStyle: React.CSSProperties = {
  display: "flex",
  backgroundColor: "var(--color-bg-inset)",
  borderRadius: "10px",
  padding: "4px",
  marginBottom: "20px",
};

const segmentButtonStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "8px 16px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  transition: "background-color 200ms, color 200ms, box-shadow 200ms",
  backgroundColor: isActive ? "var(--color-bg-card)" : "transparent",
  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
});
```

Render the segment control in the JSX (after the disclosure warning, before the periods content):

```tsx
<div style={segmentContainerStyle}>
  <button
    style={segmentButtonStyle(activeTab === "outstanding")}
    onClick={() => setActiveTab("outstanding")}
  >
    Outstanding ({incompletePeriods.length})
  </button>
  <button
    style={segmentButtonStyle(activeTab === "completed")}
    onClick={() => setActiveTab("completed")}
  >
    Completed ({completePeriods.length})
  </button>
</div>
```

- [ ] **Step 2: Wrap existing outstanding content in conditional**

Wrap the existing outstanding periods `<div>` (the `<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>` containing `incompletePeriods.map(...)`) in a conditional:

```tsx
{
  activeTab === "outstanding" && (
    <>
      {/* existing outstanding periods content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {incompletePeriods.map((period, index) => {
          // ... existing card code unchanged ...
        })}
      </div>

      {/* Empty state — show when no outstanding periods */}
      {incompletePeriods.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            backgroundColor: "var(--color-bg-card)",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <span
            style={{
              color: "var(--color-success)",
              display: "flex",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <CheckCircle2 size={32} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: "0 0 4px 0",
            }}
          >
            All caught up
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
            No outstanding accounting periods for this company.
          </p>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Remove the old completed periods section and the old empty state**

Delete the old "Completed periods" `<h3>` + list section and the old combined empty state (`incompletePeriods.length === 0 && completePeriods.length === 0`) block at the bottom of the component. These are replaced by the tab-based rendering.

- [ ] **Step 4: Verify it builds and outstanding tab works**

Run: `npm run build`
Expected: Build succeeds. Outstanding tab displays existing period cards. Completed tab shows nothing yet (we'll add it next).

- [ ] **Step 5: Commit**

```bash
git add src/components/filings-tab.tsx
git commit -m "feat: add segment control sub-tabs to FilingsTab"
```

---

### Task 3: Build the Completed tab content

**Files:**

- Modify: `src/components/filings-tab.tsx`

- [ ] **Step 1: Add the completed tab rendering**

Add the completed tab conditional block after the outstanding tab block:

```tsx
{
  activeTab === "completed" && (
    <>
      {completePeriods.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[...completePeriods].reverse().map((period) => {
            const accountsFiling = getFilingForPeriod(period, "accounts");
            const ct600Filing = getFilingForPeriod(period, "ct600");

            return (
              <div
                key={period.periodEnd.toISOString()}
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* Period header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "14px",
                  }}
                >
                  <span style={{ color: "var(--color-success)", display: "flex" }}>
                    <CheckCircle2 size={16} color="currentColor" strokeWidth={2} />
                  </span>
                  <h2
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                      margin: 0,
                    }}
                  >
                    {formatDate(period.periodStart)} &ndash; {formatDate(period.periodEnd)}
                  </h2>
                </div>

                {/* Filing rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* Accounts row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      backgroundColor: "var(--color-bg-inset)",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          margin: 0,
                        }}
                      >
                        Accounts
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-secondary)",
                          margin: 0,
                        }}
                      >
                        {accountsFiling?.confirmedAt
                          ? `Accepted ${formatShortDate(accountsFiling.confirmedAt)}`
                          : "Accepted"}
                        {" · "}
                        {accountsFiling?.submittedAt ? "Filed via DormantFile" : "Filed elsewhere"}
                      </p>
                    </div>
                    <FilingStatusBadge
                      status={accountsFiling?.status ?? ("accepted" as FilingStatus)}
                      filingType="accounts"
                    />
                  </div>

                  {/* CT600 row — only if registered for corp tax */}
                  {registeredForCorpTax && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        backgroundColor: "var(--color-bg-inset)",
                        borderRadius: "8px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                            margin: 0,
                          }}
                        >
                          CT600
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-secondary)",
                            margin: 0,
                          }}
                        >
                          {ct600Filing ? (
                            <>
                              {ct600Filing.confirmedAt
                                ? `Accepted ${formatShortDate(ct600Filing.confirmedAt)}`
                                : "Accepted"}
                              {" · "}
                              {ct600Filing.submittedAt
                                ? "Filed via DormantFile"
                                : "Filed elsewhere"}
                            </>
                          ) : (
                            "Not tracked for this period"
                          )}
                        </p>
                      </div>
                      {ct600Filing ? (
                        <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
                      ) : (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "9999px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "var(--color-bg-inset)",
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          N/A
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            backgroundColor: "var(--color-bg-card)",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: "0 0 4px 0",
            }}
          >
            No completed filings yet
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
            Completed filings will appear here once accepted by Companies House or HMRC.
          </p>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/filings-tab.tsx
git commit -m "feat: add detailed completed filings tab with filing history"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Smoke test in dev**

Run: `npm run dev`

Check the following on a company page:

1. Sub-tab bar renders below the disclosure warning (if any) with correct counts
2. Outstanding tab shows existing period cards with all actions working
3. Completed tab shows detailed cards with status badges, dates, and source hints
4. Clicking between tabs switches instantly
5. Empty states render correctly (test with a company that has no outstanding / no completed)
6. Dark mode renders correctly (segment control, cards, badges all use CSS vars)

- [ ] **Step 2: Commit any fixes if needed**
