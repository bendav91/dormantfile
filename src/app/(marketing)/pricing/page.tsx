import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "Pricing | DormantFile",
  description:
    "DormantFile pricing: from £19/year for one dormant company. Compare to accountants and other software.",
  openGraph: {
    title: "Pricing | DormantFile",
    description:
      "DormantFile pricing: from £19/year for one dormant company.",
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

const plans = [
  {
    name: "Basic",
    price: "19",
    period: "per year",
    description: "1 dormant company",
    features: [
      "Annual accounts filing with Companies House",
      "Nil CT600 filing with HMRC",
      "Direct submission via official APIs",
      "Email deadline reminders",
      "Filing confirmation & history",
    ],
    highlighted: false,
  },
  {
    name: "Multiple",
    price: "39",
    period: "per year",
    description: "Up to 10 companies",
    features: [
      "Everything in Basic",
      "File for up to 10 dormant companies",
      "Manage all companies from one dashboard",
      "Individual filing per company",
    ],
    highlighted: true,
  },
  {
    name: "Agent",
    price: "49",
    period: "per year",
    description: "Up to 100 companies",
    features: [
      "Everything in Multiple",
      "File for up to 100 dormant companies",
      "File as agent on behalf of clients",
      "Ideal for accountants",
    ],
    highlighted: false,
  },
];

const comparison = [
  { method: "DormantFile", cost: "From £19/year", time: "Under 2 minutes", notes: "Both filings from one dashboard" },
  { method: "Accountant", cost: "£80–£150+ per company", time: "Varies", notes: "Overkill for nil returns, but gives professional advice" },
  { method: "General accounting software", cost: "£100+/year", time: "30+ minutes", notes: "Designed for trading companies, not dormant" },
  { method: "DIY (manual filing)", cost: "Free (accounts only)", time: "1–2 hours", notes: "No CT600 option since CATO closed" },
];

const billingFaq = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel via the billing portal and your subscription remains active until the end of the current billing period. No refunds for partial periods." },
  { q: "Can I upgrade or downgrade?", a: "Yes. Upgrade immediately or downgrade at the end of your billing period via your account settings." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards via Stripe. We don't currently accept bank transfers or direct debits." },
  { q: "Do you offer refunds?", a: "We don't offer refunds for partial billing periods. If you're unsure, start with Basic - you can always upgrade later." },
];

export default function PricingPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Pricing" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Pricing" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
          textAlign: "center",
        }}
      >
        Simple, transparent pricing
      </h1>
      <p style={{ ...paragraph, textAlign: "center", marginBottom: "32px" }}>
        One dormant company or a hundred - pick the plan that fits.
      </p>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="rounded-xl p-7 flex flex-col"
            style={{
              border: plan.highlighted
                ? "2px solid #2563EB"
                : "1px solid #E2E8F0",
              backgroundColor: "#ffffff",
              position: "relative",
            }}
          >
            {plan.highlighted && (
              <span
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#2563EB",
                  color: "#ffffff",
                  padding: "3px 14px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Most popular
              </span>
            )}
            <p
              className="font-semibold text-sm mb-1"
              style={{ color: "#2563EB" }}
            >
              {plan.name}
            </p>
            <div className="mb-1">
              <span
                className="text-4xl font-bold"
                style={{ color: "#1E293B" }}
              >
                &pound;{plan.price}
              </span>
              <span className="text-sm ml-1" style={{ color: "#64748B" }}>
                {plan.period}
              </span>
            </div>
            <p className="text-sm mb-6" style={{ color: "#64748B" }}>
              {plan.description}
            </p>
            <ul className="space-y-2.5 mb-7 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <CheckCircle
                    size={16}
                    style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }}
                  />
                  <span className="text-sm" style={{ color: "#475569" }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block w-full text-center font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              style={{
                backgroundColor: plan.highlighted ? "#F97316" : "#2563EB",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 16px 0",
        }}
      >
        How does DormantFile compare?
      </h2>
      <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff" }}>
          <thead>
            <tr>
              {["Method", "Cost", "Time", "Notes"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "0.75rem",
                    borderBottom: "2px solid #E2E8F0",
                    fontWeight: 600,
                    color: "#1E293B",
                    fontSize: "14px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={row.method}>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#1E293B",
                    fontWeight: row.method === "DormantFile" ? 600 : 400,
                    fontSize: "14px",
                  }}
                >
                  {row.method}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  {row.cost}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  {row.time}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Billing FAQ */}
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 16px 0",
        }}
      >
        Billing questions
      </h2>
      {billingFaq.map((item) => (
        <div key={item.q} style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#1E293B",
              margin: "0 0 4px 0",
            }}
          >
            {item.q}
          </h3>
          <p style={{ ...paragraph, margin: 0 }}>{item.a}</p>
        </div>
      ))}

      <ContentCTA />
    </>
  );
}
