import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import {
  Shield,
  Clock,
  FileCheck,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { FAQPageJsonLd } from "@/lib/content/json-ld";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DormantFile — Dormant Company Filing Made Simple",
  description: "File your dormant company accounts and nil CT600 tax returns online. Direct submission to Companies House and HMRC from one dashboard. From £19/year.",
  openGraph: {
    title: "DormantFile — Dormant Company Filing Made Simple",
    description: "File your dormant company accounts and nil CT600 tax returns online. From £19/year.",
    type: "website",
    siteName: "DormantFile",
  },
};

const faqItems = [
  {
    question: "Is my data secure?",
    answer: "Yes. Your HMRC Gateway credentials are used only at the moment of submission and are never written to our database. All data is transmitted over TLS and stored securely.",
  },
  {
    question: "What filings does DormantFile handle?",
    answer: "DormantFile handles two filings: annual accounts to Companies House (required for all companies) and a nil CT600 Corporation Tax return to HMRC (for companies registered for Corporation Tax). Both confirm that your company was dormant during the period.",
  },
  {
    question: "What if my company isn't registered for Corporation Tax?",
    answer: "No problem — most dormant companies only need to file annual accounts with Companies House. You can add Corporation Tax filing later if needed.",
  },
  {
    question: "Can I use this if my company is trading?",
    answer: "No. DormantFile is designed exclusively for genuinely dormant companies with no income, expenditure, or assets. If your company has been trading, you will need a full accountant.",
  },
  {
    question: "What happens after I file?",
    answer: "You receive acknowledgements from Companies House and HMRC, which we display in your dashboard and send to you by email. Your filing records are stored so you have a history of past submissions.",
  },
];

export default function LandingPage() {
  return (
    <div
      className={ibmPlexSans.className}
      style={{ backgroundColor: "var(--color-bg-page)", color: "var(--color-text-primary)" }}
    >
      {/* Navigation */}
      <MarketingNav />

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-[960px] mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6"
            style={{ color: "var(--color-text-primary)" }}
          >
            Dormant company filing,{" "}
            <span style={{ color: "var(--color-primary)" }}>sorted</span>
          </h1>
          <p
            className="text-xl leading-relaxed mb-10 max-w-2xl mx-auto text-balance"
            style={{ color: "var(--color-text-body)" }}
          >
            Annual accounts to Companies House and nil Corporation Tax returns
            to HMRC — filed directly from one dashboard. Catch up on missed
            periods or stay current. No accounting knowledge needed.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundColor: "var(--color-cta)",
              color: "var(--color-bg-card)",
              padding: "16px 32px",
              borderRadius: "8px",
            }}
          >
            Start filing <ArrowRight size={18} />
          </Link>
          <p
            className="mt-5 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            For genuinely dormant companies only — no trading activity, no
            assets, no income.
          </p>
        </div>
      </section>

      {/* Trust Indicators */}
      <section
        style={{ backgroundColor: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
        className="py-10 px-6"
      >
        <div className="max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <Shield size={22} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                  Credentials never stored
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  Your Gateway password is used once and discarded.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <Clock size={22} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                  File in under 2 minutes
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  No accounting knowledge required.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <FileCheck size={22} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                  Direct submission
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  Filed directly with Companies House and HMRC — no middlemen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-[960px] mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-14"
            style={{ color: "var(--color-text-primary)" }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                1
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--color-text-primary)" }}>
                Add your company
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Enter your company number — we look up the rest from Companies
                House. No data entry needed.
              </p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                2
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--color-text-primary)" }}>
                We remind you
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Email reminders at 90, 30, 14, 7, 3, and 1 day before each
                filing deadline.
              </p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 flex-shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                3
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--color-text-primary)" }}>
                File in minutes
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Submit your dormant accounts and nil CT600 return directly to
                Companies House and HMRC.
              </p>
            </div>
          </div>
          <p className="text-center mt-8">
            <Link
              href="/how-it-works"
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: "var(--color-primary)" }}
            >
              See the full walkthrough &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Problem Statement */}
      <section
        style={{ backgroundColor: "var(--color-primary-bg)", borderTop: "1px solid var(--color-primary-border)", borderBottom: "1px solid var(--color-primary-border)" }}
        className="py-20 px-6"
      >
        <div className="max-w-[960px] mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: "var(--color-text-primary)" }}>
            CATO closed. Now what?
          </h2>
          <p className="text-pretty text-lg leading-relaxed mb-4" style={{ color: "var(--color-text-body)" }}>
            On 31 March 2026, HMRC shut down its free Corporation Tax filing
            tool (CATO). Thousands of directors of dormant companies — side
            projects, holding structures, companies kept for future use — lost
            their only free way to file a CT600 return.
          </p>
          <p className="text-pretty text-lg leading-relaxed" style={{ color: "var(--color-text-body)" }}>
            DormantFile was built as the direct replacement. We handle both of
            the filings a dormant company needs: annual accounts to Companies
            House and nil CT600 returns to HMRC. One dashboard, under two
            minutes, from £19 a year.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-[960px] mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Simple, transparent pricing
          </h2>
          <p
            className="text-center text-base mb-12 max-w-xl mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            One dormant company or a hundred — pick the plan that fits.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: "Basic",
                price: "19",
                period: "per year",
                description: "1 dormant company",
                features: [
                  "Both filings — accounts and CT600",
                  "File any outstanding period",
                  "Direct submission to CH and HMRC",
                  "Email deadline reminders",
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
                  "Catch up on missed periods",
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
            ].map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl p-7 flex flex-col"
                style={{
                  border: plan.highlighted ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-card)",
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
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-bg-card)",
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
                <p className="font-semibold text-sm mb-1" style={{ color: "var(--color-primary)" }}>
                  {plan.name}
                </p>
                <div className="mb-1">
                  <span className="text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                    £{plan.price}
                  </span>
                  <span className="text-sm ml-1" style={{ color: "var(--color-text-secondary)" }}>
                    {plan.period}
                  </span>
                </div>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                  {plan.description}
                </p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle
                        size={16}
                        style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }}
                      />
                      <span className="text-sm" style={{ color: "var(--color-text-body)" }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block w-full text-center font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90"
                  style={{
                    backgroundColor: plan.highlighted ? "var(--color-cta)" : "var(--color-primary)",
                    color: "var(--color-bg-card)",
                    padding: "12px 24px",
                    borderRadius: "8px",
                  }}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <p
            className="text-xs text-center mt-6"
            style={{ color: "var(--color-text-muted)" }}
          >
            Compare to £100+ for most accounting software. All plans include credentials-never-stored security.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <FAQPageJsonLd items={faqItems} />
      <section
        style={{ backgroundColor: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}
        className="py-20 px-6"
      >
        <div className="max-w-[960px] mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: "var(--color-text-primary)" }}
          >
            Common questions
          </h2>
          <div className="space-y-8">
            {faqItems.map(({ question, answer }) => (
              <div
                key={question}
                style={{ borderBottom: "1px solid var(--color-border)" }}
                className="pb-8"
              >
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {question}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{ backgroundColor: "#1E293B" }}
        className="py-24 px-6 text-center"
      >
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Ready to file your dormant company returns?
          </h2>
          <p className="text-lg mb-10" style={{ color: "var(--color-text-muted)" }}>
            Set up in minutes. File in seconds. Done for the year.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundColor: "var(--color-cta)",
              color: "var(--color-bg-card)",
              padding: "16px 32px",
              borderRadius: "8px",
            }}
          >
            Start filing today <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
