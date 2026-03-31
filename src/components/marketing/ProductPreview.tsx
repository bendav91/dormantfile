"use client";

import { useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { BrowserFrame } from "@/components/marketing/BrowserFrame";
import { cn } from "@/lib/cn";

const tabs = ["Add your company", "File in one click", "Get confirmation"] as const;
type Tab = (typeof tabs)[number];

function TabAddCompany() {
  return (
    <div>
      {/* Search input */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border border-border rounded-lg bg-page mb-4">
        <Search size={16} className="text-muted shrink-0" />
        <span className="text-sm text-muted">
          Search by company name or number...
        </span>
      </div>

      {/* Result card */}
      <div className="border border-border rounded-lg p-4 bg-page">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-[15px] text-foreground mb-1">
              EXAMPLE HOLDINGS LTD
            </p>
            <p className="text-[13px] text-secondary mb-0.5">
              Company number: 12345678
            </p>
            <p className="text-[13px] text-secondary mb-2">
              10 Example Street, London, EC1A 1BB
            </p>
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-[4px] bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-success">
              Active
            </span>
          </div>

          <button
            type="button"
            className="px-4 py-2 text-[13px] font-semibold rounded-md border-none bg-primary text-[#ffffff] cursor-default whitespace-nowrap"
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
    <div className="border border-border rounded-lg p-5 bg-page">
      <p className="font-semibold text-[15px] text-foreground mb-3">
        EXAMPLE HOLDINGS LTD
      </p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
        <div>
          <p className="text-xs text-muted mb-0.5">
            Period
          </p>
          <p className="text-sm text-body">
            01 Apr 2025 &ndash; 31 Mar 2026
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-0.5">
            Filing type
          </p>
          <p className="text-sm text-body">
            Dormant accounts + CT600
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center gap-3">
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-[4px] bg-inset text-muted">
          Ready to file
        </span>

        <button
          type="button"
          className="px-4 py-2 text-[13px] font-semibold rounded-md border-none bg-cta text-[#ffffff] cursor-default whitespace-nowrap"
        >
          Submit filings
        </button>
      </div>
    </div>
  );
}

function TabGetConfirmation() {
  return (
    <div className="text-center py-2">
      <CheckCircle2
        size={48}
        className="text-success mx-auto mb-3"
      />
      <h4 className="text-lg font-semibold text-foreground mb-4">
        Filed successfully
      </h4>

      <div className="flex flex-col gap-2 items-center mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-success shrink-0" />
          <span className="text-sm text-body">
            Accounts accepted by Companies House
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-success shrink-0" />
          <span className="text-sm text-body">
            CT600 accepted by HMRC
          </span>
        </div>
      </div>

      <p className="text-[13px] text-muted">
        29 March 2026, 14:32
      </p>
    </div>
  );
}

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<Tab>("Add your company");

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 px-1 text-[13px] bg-transparent border-none border-b-2 cursor-pointer transition-[color,border-color] duration-150 -mb-px",
                isActive
                  ? "font-semibold text-primary border-b-primary"
                  : "font-normal text-muted border-b-transparent"
              )}
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
