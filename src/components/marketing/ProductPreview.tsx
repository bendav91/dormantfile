"use client";

import { useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { BrowserFrame } from "@/components/marketing/BrowserFrame";

const tabs = ["Add your company", "File in one click", "Get confirmation"] as const;
type Tab = (typeof tabs)[number];

function TabAddCompany() {
  return (
    <div>
      {/* Search input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          backgroundColor: "var(--color-bg-page)",
          marginBottom: "16px",
        }}
      >
        <Search size={16} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        <span
          style={{
            fontSize: "14px",
            color: "var(--color-text-muted)",
          }}
        >
          Search by company name or number...
        </span>
      </div>

      {/* Result card */}
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "16px",
          backgroundColor: "var(--color-bg-page)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "200px" }}>
            <p
              style={{
                fontWeight: 600,
                fontSize: "15px",
                color: "var(--color-text-primary)",
                margin: "0 0 4px 0",
              }}
            >
              EXAMPLE HOLDINGS LTD
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: "0 0 2px 0",
              }}
            >
              Company number: 12345678
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: "0 0 8px 0",
              }}
            >
              10 Example Street, London, EC1A 1BB
            </p>
            <span
              style={{
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
                color: "var(--color-success)",
              }}
            >
              Active
            </span>
          </div>

          <button
            type="button"
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--color-primary)",
              color: "#ffffff",
              cursor: "default",
              whiteSpace: "nowrap",
            }}
          >
            Add company
          </button>
        </div>
      </div>
    </div>
  );
}

function TabFileInOneClick() {
  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        padding: "20px",
        backgroundColor: "var(--color-bg-page)",
      }}
    >
      <p
        style={{
          fontWeight: 600,
          fontSize: "15px",
          color: "var(--color-text-primary)",
          margin: "0 0 12px 0",
        }}
      >
        EXAMPLE HOLDINGS LTD
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 24px",
          marginBottom: "16px",
        }}
      >
        <div>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 2px 0" }}>
            Period
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: 0 }}>
            01 Apr 2025 &ndash; 31 Mar 2026
          </p>
        </div>
        <div>
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 2px 0" }}>
            Filing type
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-text-body)", margin: 0 }}>
            Dormant accounts + CT600
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: "4px",
            backgroundColor: "var(--color-bg-inset)",
            color: "var(--color-text-muted)",
          }}
        >
          Ready to file
        </span>

        <button
          type="button"
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "6px",
            border: "none",
            backgroundColor: "var(--color-cta)",
            color: "#ffffff",
            cursor: "default",
            whiteSpace: "nowrap",
          }}
        >
          Submit filings
        </button>
      </div>
    </div>
  );
}

function TabGetConfirmation() {
  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <CheckCircle2
        size={48}
        style={{ color: "var(--color-success)", margin: "0 auto 12px auto" }}
      />
      <h4
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 16px 0",
        }}
      >
        Filed successfully
      </h4>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
          <span style={{ fontSize: "14px", color: "var(--color-text-body)" }}>
            Accounts accepted by Companies House
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
          <span style={{ fontSize: "14px", color: "var(--color-text-body)" }}>
            CT600 accepted by HMRC
          </span>
        </div>
      </div>

      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
        29 March 2026, 14:32
      </p>
    </div>
  );
}

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<Tab>("Add your company");

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "20px",
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "10px 4px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                marginBottom: "-1px",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Browser frame with tab content */}
      <BrowserFrame>
        {activeTab === "Add your company" && <TabAddCompany />}
        {activeTab === "File in one click" && <TabFileInOneClick />}
        {activeTab === "Get confirmation" && <TabGetConfirmation />}
      </BrowserFrame>
    </div>
  );
}
