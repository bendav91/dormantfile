import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Bell,
  Building2,
  CalendarCheck,
  ClipboardCopy,
  Coins,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FastForward,
  FileCode,
  FileText,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SquareCheckBig,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Features | DormantFile",
  description:
    "Everything DormantFile does for you — automatic gap detection, deadline intelligence, iXBRL generation, direct API submission, and more.",
  alternates: { canonical: `${BASE_URL}/features` },
  openGraph: {
    title: "Features | DormantFile",
    description: "Purpose-built for dormant companies. See what's under the hood.",
    type: "website",
    siteName: "DormantFile",
  },
};

/* ─── Types ─── */

interface FeatureItem {
  icon: LucideIcon;
  heading: string;
  description: string;
  tag?: string;
}

/* ─── Feature data ─── */

const SETUP_FEATURES: FeatureItem[] = [
  {
    icon: Search,
    heading: "Companies House lookup",
    description:
      "Enter your company number and we pull your name, incorporation date, accounting reference date, registered address, and SIC codes automatically.",
  },
  {
    icon: Layers,
    heading: "Automatic gap detection",
    description:
      "We fetch your full Companies House filing history and calculate every unfiled period since incorporation. Years behind? You\u2019ll see exactly what needs filing.",
  },
  {
    icon: Coins,
    heading: "Share capital extraction",
    description:
      "If your company has issued shares, we pull the amount from your latest confirmation statement. It\u2019s pre-filled \u2014 just confirm and move on.",
  },
];

const FILING_FEATURES: FeatureItem[] = [
  {
    icon: FileCode,
    heading: "iXBRL document generation",
    description:
      "We generate the iXBRL accounts and tax computation documents required by Companies House and HMRC. You never see the XML \u2014 it\u2019s handled automatically.",
  },
  {
    icon: Send,
    heading: "Direct API submission",
    description:
      "Your filings go through the same official HMRC GovTalk and Companies House Software Filing APIs that Xero and FreeAgent use.",
  },
  {
    icon: Activity,
    heading: "Real-time status tracking",
    description:
      "After submission, we poll HMRC and Companies House for your filing result. If it\u2019s accepted, you\u2019ll know within minutes. If there\u2019s an issue, you\u2019ll see exactly why.",
  },
  {
    icon: FastForward,
    heading: "Catch-up filing",
    description:
      "File any outstanding period, not just the current one. If you\u2019re years behind, work through them one at a time in a single sitting.",
  },
  {
    icon: SquareCheckBig,
    heading: "Mark as filed elsewhere",
    description:
      "Filed accounts or a CT600 through your accountant or another service? Mark the period as done so it stops appearing in your outstanding list and reminders.",
  },
  {
    icon: ShieldCheck,
    heading: "Submission confirmation",
    description:
      "Before every filing, you\u2019ll see a clear summary of exactly what\u2019s being submitted, to which authority, and for which period. Nothing is sent until you confirm.",
  },
];

const MONITORING_FEATURES: FeatureItem[] = [
  {
    icon: Bell,
    heading: "Deadline intelligence",
    description:
      "Reminders at 90, 30, 14, 7, 3, and 1 day before each filing is due. Overdue alerts at 1, 7, 30, and 90+ days after. One consolidated email per day, penalty amounts included.",
  },
  {
    icon: RefreshCw,
    heading: "Daily Companies House sync",
    description:
      "Your company data is refreshed against Companies House every day. If your accounting reference date changes or a period is filed elsewhere, we detect it automatically.",
  },
  {
    icon: Eye,
    heading: "External filing detection",
    description:
      "Filed a period through your accountant or another tool? We detect it in your Companies House filing history and mark it as done \u2014 no manual cleanup.",
  },
  {
    icon: EyeOff,
    heading: "Period suppression",
    description:
      "Have a period you\u2019re handling separately? Suppress it so it stops appearing in reminders and your needs-attention list.",
  },
  {
    icon: CalendarCheck,
    heading: "Calendar feed",
    description:
      "Subscribe to your filing deadlines in Google Calendar, Outlook, or any calendar app. Deadlines update automatically as you file.",
  },
  {
    icon: History,
    heading: "Company activity timeline",
    description:
      "See a chronological history of every event for each company \u2014 filings submitted, acceptances, rejections, and reminders sent.",
  },
];

const SECURITY_FEATURES: FeatureItem[] = [
  {
    icon: KeyRound,
    heading: "Credentials never stored",
    description:
      "Your HMRC Government Gateway password is used once at submission and immediately discarded from memory. Never written to disk, never logged.",
  },
  {
    icon: Archive,
    heading: "Filing audit trail",
    description:
      "Every response from HMRC and Companies House is stored against your filing record \u2014 correlation IDs, timestamps, and full response payloads. Yours to reference if you ever need proof.",
  },
  {
    icon: FileText,
    heading: "Printable filing receipts",
    description:
      "View and print a confirmation receipt for every accepted filing. Includes your company details, period, submission reference, and IRmark.",
  },
  {
    icon: ClipboardCopy,
    heading: "Share filing confirmations",
    description:
      "Copy a formatted filing summary to your clipboard in one click. Useful for sharing confirmation details with directors or clients.",
  },
  {
    icon: CreditCard,
    heading: "Payments via Stripe",
    description:
      "Card details are handled entirely by Stripe. We never see or store your payment information.",
  },
  {
    icon: RotateCcw,
    heading: "14-day refund guarantee",
    description:
      "Full refund within 14 days if you haven\u2019t submitted a filing. No questions.",
  },
];

const PORTFOLIO_FEATURES: FeatureItem[] = [
  {
    icon: LayoutDashboard,
    heading: "Portfolio dashboard",
    description:
      "All your companies in one view. Filter by needs-attention, recently filed, or issues. Search and sort as the list grows.",
  },
  {
    icon: Mail,
    heading: "Consolidated reminders",
    description:
      "One email per day covering every company\u2019s upcoming and overdue deadlines. No email per company \u2014 just one summary.",
  },
  {
    icon: Download,
    heading: "CSV export",
    description:
      "Download your full company list with filing statuses, deadlines, and period data as a CSV. Open in Excel or Google Sheets for your own records.",
  },
];

const AGENT_FEATURES: FeatureItem[] = [
  {
    icon: Users,
    heading: "Agent filing mode",
    description:
      "File CT600 returns on behalf of clients using your own HMRC Government Gateway credentials. The submission declares you as agent \u2014 your clients don\u2019t need to share their login.",
  },
  {
    icon: Building2,
    heading: "Scales to 100 companies",
    description:
      "Manage up to 100 dormant companies from one account at 49p per company per year.",
  },
];

/* ─── Section navigation ─── */

const SECTIONS = [
  { label: "Smart setup", id: "smart-setup" },
  { label: "Filing", id: "filing" },
  { label: "Monitoring", id: "monitoring" },
  { label: "Security", id: "security" },
  { label: "Multi-company", id: "multi-company" },
];

/* ─── Helper components ─── */

function IconBox({
  icon: Icon,
  variant = "primary",
}: {
  icon: LucideIcon;
  variant?: "primary" | "trust";
}) {
  const isGreen = variant === "trust";
  return (
    <div
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        backgroundColor: isGreen ? "var(--color-success-bg)" : "var(--color-primary-bg)",
        border: `1px solid ${isGreen ? "var(--color-success-border)" : "var(--color-primary-border)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon
        size={20}
        style={{ color: isGreen ? "var(--color-success)" : "var(--color-primary)" }}
      />
    </div>
  );
}

function SectionHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <span
        style={{
          display: "inline-block",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "var(--color-primary)",
          backgroundColor: "var(--color-primary-bg)",
          padding: "4px 10px",
          borderRadius: "6px",
          marginBottom: "12px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {number}
      </span>
      <h2
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: "0 0 8px 0",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: "15px",
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  item,
  variant = "primary",
  accent = false,
}: {
  item: FeatureItem;
  variant?: "primary" | "trust";
  accent?: boolean;
}) {
  return (
    <div
      className="hoverable-card"
      style={{
        padding: "24px",
        borderRadius: "12px",
        border: `1px solid ${accent ? "var(--color-primary-border)" : "var(--color-border)"}`,
        backgroundColor: "var(--color-bg-card)",
        transition: "border-color 200ms, background-color 200ms",
        height: "100%",
      }}
    >
      <IconBox icon={item.icon} variant={variant} />
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "14px 0 6px 0",
        }}
      >
        {item.heading}
      </h3>
      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          margin: 0,
        }}
      >
        {item.description}
      </p>
    </div>
  );
}

/* ─── Deadline timeline visual ─── */

const REMINDER_INTERVALS = [
  { label: "90d", urgent: false },
  { label: "30d", urgent: false },
  { label: "14d", urgent: false },
  { label: "7d", urgent: false },
  { label: "3d", urgent: true },
  { label: "1d", urgent: true },
];

/* ─── Page ─── */

export default function FeaturesPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: baseUrl }, { name: "Features" }]} />
      <Breadcrumbs items={[{ label: "Features" }]} />

      <article>
        {/* ── Hero ── */}
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Everything DormantFile{" "}
          <span style={{ color: "var(--color-primary)" }}>does for you</span>
        </h1>
        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.7,
            color: "var(--color-text-body)",
            marginBottom: "24px",
          }}
        >
          Purpose-built for dormant companies. Here&apos;s what&apos;s under the hood.
        </p>

        {/* Section navigation */}
        <nav className="flex flex-wrap gap-2 mb-14" aria-label="Feature categories">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="hoverable-pill"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                padding: "6px 14px",
                borderRadius: "8px",
                textDecoration: "none",
                transition: "filter 150ms",
              }}
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* ── Sections ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
          {/* ── 01 Smart setup ── */}
          <section id="smart-setup" style={{ scrollMarginTop: "80px" }}>
            <SectionHeader
              number="01"
              title="Smart setup"
              description="Add your company in seconds. We handle the rest automatically."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SETUP_FEATURES.map((item, i) => (
                <div
                  key={item.heading}
                  style={{
                    padding: "24px",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-card)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "44px",
                      fontWeight: 800,
                      color: "var(--color-border)",
                      lineHeight: 1,
                      marginBottom: "16px",
                      letterSpacing: "-0.04em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <IconBox icon={item.icon} />
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      margin: "14px 0 6px 0",
                    }}
                  >
                    {item.heading}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "var(--color-text-secondary)",
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 02 Filing ── */}
          <section id="filing" style={{ scrollMarginTop: "80px" }}>
            <SectionHeader
              number="02"
              title="Filing"
              description="Generate compliant documents and submit directly to HMRC and Companies House."
            />
            {/* Core filing features — accent border */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {FILING_FEATURES.slice(0, 2).map((item) => (
                <FeatureCard key={item.heading} item={item} accent />
              ))}
            </div>
            {/* Supporting filing features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FILING_FEATURES.slice(2).map((item) => (
                <FeatureCard key={item.heading} item={item} />
              ))}
            </div>
          </section>

          {/* ── 03 Monitoring ── */}
          <section id="monitoring" style={{ scrollMarginTop: "80px" }}>
            <SectionHeader
              number="03"
              title="Monitoring"
              description="Never miss a deadline. We watch your filings around the clock."
            />

            {/* Spotlight: Deadline intelligence */}
            <div
              style={{
                padding: "28px",
                borderRadius: "14px",
                border: "1px solid var(--color-primary-border)",
                backgroundColor: "var(--color-primary-bg)",
                marginBottom: "16px",
              }}
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <IconBox icon={MONITORING_FEATURES[0].icon} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {MONITORING_FEATURES[0].heading}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "var(--color-text-secondary)",
                      margin: "0 0 16px 0",
                    }}
                  >
                    {MONITORING_FEATURES[0].description}
                  </p>

                  {/* Visual reminder timeline */}
                  <div className="flex flex-wrap items-center gap-1">
                    {REMINDER_INTERVALS.map((interval, i, arr) => (
                      <div key={interval.label} className="flex items-center">
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: interval.urgent
                              ? "var(--color-danger-bg)"
                              : "var(--color-bg-card)",
                            color: interval.urgent
                              ? "var(--color-danger)"
                              : "var(--color-primary)",
                            border: `1px solid ${interval.urgent ? "var(--color-danger-border)" : "var(--color-border)"}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {interval.label}
                        </span>
                        {i < arr.length - 1 && (
                          <span
                            className="hidden sm:inline-block"
                            style={{
                              width: "16px",
                              height: "1px",
                              backgroundColor: "var(--color-border)",
                              margin: "0 2px",
                            }}
                          />
                        )}
                      </div>
                    ))}
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--color-danger)",
                        marginLeft: "4px",
                      }}
                    >
                      &rarr; Due
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remaining monitoring features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MONITORING_FEATURES.slice(1).map((item) => (
                <FeatureCard key={item.heading} item={item} />
              ))}
            </div>
          </section>

          {/* ── 04 Security & trust ── */}
          <section id="security" style={{ scrollMarginTop: "80px" }}>
            <SectionHeader
              number="04"
              title="Security & trust"
              description="Your credentials are handled with care. Here&apos;s how we keep them safe."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SECURITY_FEATURES.map((item) => (
                <FeatureCard key={item.heading} item={item} variant="trust" />
              ))}
            </div>
          </section>

          {/* ── 05 Multi-company & agent filing ── */}
          <section id="multi-company" style={{ scrollMarginTop: "80px" }}>
            <SectionHeader
              number="05"
              title="Multi-company & agent filing"
              description="Managing multiple dormant companies? We built this for you."
            />

            {/* Portfolio features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {PORTFOLIO_FEATURES.map((item) => (
                <FeatureCard key={item.heading} item={item} />
              ))}
            </div>

            {/* Agent plan callout */}
            <div
              style={{
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid var(--color-primary-border)",
                backgroundColor: "var(--color-primary-bg)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    backgroundColor: "var(--color-bg-card)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-primary-border)",
                  }}
                >
                  Agent plan
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  For accountants and formation agents
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {AGENT_FEATURES.map((item) => (
                  <div key={item.heading} className="flex gap-4">
                    <IconBox icon={item.icon} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          margin: "0 0 4px 0",
                        }}
                      >
                        {item.heading}
                      </h3>
                      <p
                        style={{
                          fontSize: "14px",
                          lineHeight: 1.6,
                          color: "var(--color-text-secondary)",
                          margin: 0,
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </article>

      <ContentCTA />
    </>
  );
}
