import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";
import { cn } from "@/lib/cn";
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
      className={cn(
        "w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0 border",
        isGreen
          ? "bg-success-bg border-success-border"
          : "bg-primary-bg border-primary-border"
      )}
    >
      <Icon
        size={20}
        className={isGreen ? "text-success" : "text-primary"}
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
    <div className="mb-7">
      <span className="inline-block text-xs font-bold tracking-[0.05em] text-primary bg-primary-bg px-2.5 py-1 rounded-md mb-3 tabular-nums">
        {number}
      </span>
      <h2 className="text-2xl font-bold text-foreground mb-2 tracking-[-0.02em]">
        {title}
      </h2>
      <p className="text-[15px] leading-relaxed text-secondary m-0">
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
      className={cn(
        "hoverable-card p-6 rounded-xl border bg-card transition-[border-color,background-color] duration-200 h-full",
        accent ? "border-primary-border" : "border-border"
      )}
    >
      <IconBox icon={item.icon} variant={variant} />
      <h3 className="text-[15px] font-semibold text-foreground mt-3.5 mb-1.5">
        {item.heading}
      </h3>
      <p className="text-sm leading-relaxed text-secondary m-0">
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
        <h1 className="text-[36px] font-bold text-foreground mb-3 tracking-[-0.02em]">
          Everything DormantFile{" "}
          <span className="text-primary">does for you</span>
        </h1>
        <p className="text-[17px] leading-[1.7] text-body mb-6">
          Purpose-built for dormant companies. Here&apos;s what&apos;s under the hood.
        </p>

        {/* Section navigation */}
        <nav className="flex flex-wrap gap-2 mb-14" aria-label="Feature categories">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="hoverable-pill text-[13px] font-medium text-secondary bg-card border border-border py-1.5 px-3.5 rounded-lg no-underline transition-[filter] duration-150"
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* ── Sections ── */}
        <div className="flex flex-col gap-16">
          {/* ── 01 Smart setup ── */}
          <section id="smart-setup" className="scroll-mt-20">
            <SectionHeader
              number="01"
              title="Smart setup"
              description="Add your company in seconds. We handle the rest automatically."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SETUP_FEATURES.map((item, i) => (
                <div
                  key={item.heading}
                  className="p-6 rounded-xl border border-border bg-card"
                >
                  <div className="text-[44px] font-extrabold text-border leading-none mb-4 tracking-[-0.04em] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <IconBox icon={item.icon} />
                  <h3 className="text-[15px] font-semibold text-foreground mt-3.5 mb-1.5">
                    {item.heading}
                  </h3>
                  <p className="text-sm leading-relaxed text-secondary m-0">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 02 Filing ── */}
          <section id="filing" className="scroll-mt-20">
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
          <section id="monitoring" className="scroll-mt-20">
            <SectionHeader
              number="03"
              title="Monitoring"
              description="Never miss a deadline. We watch your filings around the clock."
            />

            {/* Spotlight: Deadline intelligence */}
            <div className="p-7 rounded-[14px] border border-primary-border bg-primary-bg mb-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <IconBox icon={MONITORING_FEATURES[0].icon} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-bold text-foreground mb-1.5">
                    {MONITORING_FEATURES[0].heading}
                  </h3>
                  <p className="text-sm leading-relaxed text-secondary mb-4">
                    {MONITORING_FEATURES[0].description}
                  </p>

                  {/* Visual reminder timeline */}
                  <div className="flex flex-wrap items-center gap-1">
                    {REMINDER_INTERVALS.map((interval, i, arr) => (
                      <div key={interval.label} className="flex items-center">
                        <span
                          className={cn(
                            "text-[11px] font-semibold py-0.5 px-2 rounded-md border whitespace-nowrap",
                            interval.urgent
                              ? "bg-danger-bg text-danger border-danger-border"
                              : "bg-card text-primary border-border"
                          )}
                        >
                          {interval.label}
                        </span>
                        {i < arr.length - 1 && (
                          <span className="hidden sm:inline-block w-4 h-px bg-border mx-0.5" />
                        )}
                      </div>
                    ))}
                    <span className="text-[11px] font-bold text-danger ml-1">
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
          <section id="security" className="scroll-mt-20">
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
          <section id="multi-company" className="scroll-mt-20">
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
            <div className="p-6 rounded-xl border border-primary-border bg-primary-bg">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-xs font-bold text-primary bg-card px-2.5 py-1 rounded-md border border-primary-border">
                  Agent plan
                </span>
                <span className="text-[13px] text-secondary">
                  For accountants and formation agents
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {AGENT_FEATURES.map((item) => (
                  <div key={item.heading} className="flex gap-4">
                    <IconBox icon={item.icon} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-foreground mb-1">
                        {item.heading}
                      </h3>
                      <p className="text-sm leading-relaxed text-secondary m-0">
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
