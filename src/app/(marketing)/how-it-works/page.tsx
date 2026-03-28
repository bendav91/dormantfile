import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "How It Works | DormantFile",
  description:
    "Step-by-step walkthrough of filing your dormant company accounts and CT600 with DormantFile.",
  openGraph: {
    title: "How It Works | DormantFile",
    description:
      "Step-by-step walkthrough of filing your dormant company accounts and CT600 with DormantFile.",
    type: "website",
    siteName: "DormantFile",
  },
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

const steps = [
  {
    number: 1,
    title: "Create your account",
    description:
      "Sign up with your email address and set a password. Takes 30 seconds.",
  },
  {
    number: 2,
    title: "Add your company",
    description:
      "Enter your company registration number - we look up the company name automatically via Companies House. Add your UTR (Unique Taxpayer Reference) and accounting period dates.",
  },
  {
    number: 3,
    title: "Choose your plan",
    description:
      "Pick the plan that fits: Basic for one company (£19/year), Multiple for up to 10 (£39/year), or Bulk for up to 100 (£49/year).",
  },
  {
    number: 4,
    title: "Get deadline reminders",
    description:
      "We calculate your filing deadlines automatically (9 months after your accounting reference date for accounts, 12 months for CT600) and send you email reminders at 90, 30, 14, 7, 3, and 1 day before they're due.",
  },
  {
    number: 5,
    title: "File your accounts",
    description:
      "When you're ready, click to file your annual dormant accounts with Companies House. We submit the AA02 directly via the Companies House software filing API. You'll need your Companies House authentication code.",
  },
  {
    number: 6,
    title: "File your CT600",
    description:
      "If your company is registered for Corporation Tax, click to file your nil CT600. Enter your HMRC Government Gateway credentials - we submit directly to HMRC via their GovTalk API. Your credentials are used once and never stored.",
  },
  {
    number: 7,
    title: "Get confirmation",
    description:
      "Once HMRC and Companies House accept your filing, we show the confirmation in your dashboard and send you an email. Your filing records are stored so you always have a history.",
  },
];

export default function HowItWorksPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "How It Works" },
        ]}
      />
      <Breadcrumbs items={[{ label: "How It Works" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
        }}
      >
        How it works
      </h1>
      <p style={{ ...paragraph, fontSize: "17px", marginBottom: "32px" }}>
        From sign-up to filed - the whole process takes under 5 minutes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {steps.map((step) => (
          <div
            key={step.number}
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#2563EB",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {step.number}
            </div>
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#1E293B",
                  margin: "0 0 4px 0",
                }}
              >
                {step.title}
              </h3>
              <p style={{ ...paragraph, margin: 0 }}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          backgroundColor: "#EFF6FF",
          borderRadius: "0.5rem",
          border: "1px solid #DBEAFE",
        }}
      >
        <p style={{ ...paragraph, margin: 0 }}>
          <strong style={{ color: "#1E293B" }}>Not registered for Corporation Tax?</strong>{" "}
          That&apos;s fine - many dormant companies only need to file annual accounts with Companies House. You can skip the CT600 step entirely. Read our guide on{" "}
          <Link href="/guides/do-i-need-ct600-dormant-company" style={{ color: "#2563EB" }}>
            whether you need a CT600
          </Link>{" "}
          for more detail.
        </p>
      </div>

      <ContentCTA />
    </>
  );
}
