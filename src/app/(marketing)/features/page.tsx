import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Bell,
  Building2,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  FileCode,
  FastForward,
  KeyRound,
  Layers,
  LayoutDashboard,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Features | DormantFile",
  description:
    "Everything DormantFile does for you — automatic gap detection, deadline intelligence, iXBRL generation, direct API submission, and more.",
  alternates: { canonical: `${BASE_URL}/features` },
  openGraph: {
    title: "Features | DormantFile",
    description:
      "Purpose-built for dormant companies. See what's under the hood.",
    type: "website",
    siteName: "DormantFile",
  },
};

interface FeatureItem {
  icon: LucideIcon;
  heading: string;
  description: string;
  tag?: string;
}

interface FeatureGroup {
  title: string;
  items: FeatureItem[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Smart setup",
    items: [
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
    ],
  },
  {
    title: "Filing",
    items: [
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
    ],
  },
  {
    title: "Monitoring",
    items: [
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
    ],
  },
  {
    title: "Security and trust",
    items: [
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
    ],
  },
  {
    title: "Multi-company and agent filing",
    items: [
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
        icon: Users,
        heading: "Agent filing mode",
        description:
          "File CT600 returns on behalf of clients using your own HMRC Government Gateway credentials. The submission declares you as agent \u2014 your clients don\u2019t need to share their login.",
        tag: "Agent plan",
      },
      {
        icon: Building2,
        heading: "Scales to 100 companies",
        description:
          "Manage up to 100 dormant companies from one account at 49p per company per year.",
        tag: "Agent plan",
      },
    ],
  },
];

export default function FeaturesPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Features" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Features" }]} />

      <article>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Everything DormantFile does for you
        </h1>
        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.7,
            color: "var(--color-text-body)",
            marginBottom: "48px",
          }}
        >
          Purpose-built for dormant companies. Here&apos;s what&apos;s under the hood.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
          {FEATURE_GROUPS.map((group) => (
            <section key={group.title}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  margin: "0 0 20px 0",
                  letterSpacing: "-0.01em",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {group.title}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {group.items.map((item, i, arr) => (
                  <div
                    key={item.heading}
                    style={{
                      display: "flex",
                      gap: "16px",
                      padding: "20px 0",
                      borderBottom:
                        i < arr.length - 1 ? "1px solid var(--color-border)" : undefined,
                    }}
                  >
                    <item.icon
                      size={18}
                      style={{
                        color: "var(--color-primary)",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                        {item.tag && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--color-primary)",
                              backgroundColor: "var(--color-primary-bg)",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.tag}
                          </span>
                        )}
                      </div>
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
            </section>
          ))}
        </div>
      </article>

      <ContentCTA />
    </>
  );
}
