import { BrowserFrame } from "@/components/marketing/BrowserFrame";
import { FilingCounter } from "@/components/marketing/FilingCounter";
import { SiteFooter } from "@/components/SiteFooter";
import { MicroTrust } from "@/components/marketing/MicroTrust";
import { Testimonials } from "@/components/marketing/Testimonials";
import { TrustBadges } from "@/components/marketing/TrustBadges";
import { TrustSection } from "@/components/marketing/TrustSection";
import { SiteNav } from "@/components/SiteNav";
import { FAQPageJsonLd } from "@/lib/content/json-ld";
import { isFilingLive } from "@/lib/launch-mode";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle,
  Clock,
  FileCheck,
  KeyRound,
  Monitor,
  RotateCcw,
  Search,
  Send,
  Shield,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "DormantFile — Dormant Company Filing Made Simple",
  description:
    "File your dormant company accounts and nil CT600 tax returns online. Direct submission to Companies House and HMRC from one dashboard. From £19/year.",
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: "DormantFile — Dormant Company Filing Made Simple",
    description:
      "File your dormant company accounts and nil CT600 tax returns online. From £19/year.",
    type: "website",
    siteName: "DormantFile",
  },
};

const faqItems = [
  {
    question: "My company has been trading \u2014 can I use this?",
    answer:
      "No. DormantFile is for genuinely dormant companies only \u2014 no income, no expenditure, no assets. If your company has been trading, you\u2019ll need a full accountant.",
  },
  {
    question: "Do I need my HMRC Gateway login?",
    answer:
      "Yes, to file the CT600 you\u2019ll enter your Government Gateway credentials. They\u2019re used once at submission and immediately discarded \u2014 never stored.",
  },
  {
    question: "I\u2019ve missed filing deadlines. Can I catch up?",
    answer:
      "Yes. You can file any outstanding period, not just the current one. Catch up on missed years in a single sitting.",
  },
  {
    question: "What if a filing gets rejected?",
    answer:
      "You\u2019ll see the rejection reason in your dashboard and can correct and resubmit. Common causes are simple data mismatches that take seconds to fix.",
  },
  {
    question: "I only need Companies House \u2014 not the CT600.",
    answer:
      "That\u2019s fine. Most dormant companies only need annual accounts. You can skip CT600 filing if your company isn\u2019t registered for Corporation Tax.",
  },
  {
    question: "Can my accountant file on behalf of clients?",
    answer:
      "Yes \u2014 the Agent plan covers up to 100 companies and supports filing on behalf of clients. It\u2019s \u00A349 a year, which works out to 49p per company.",
  },
];

export default function LandingPage() {
  return (
    <div
      className={ibmPlexSans.className}
      style={{ backgroundColor: "var(--color-bg-page)", color: "var(--color-text-primary)" }}
    >
      {/* Navigation */}
      <SiteNav variant="marketing" />

      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-20 sm:pb-28 px-6">
        <div className="max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <h1
                className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-5"
                style={{ color: "var(--color-text-primary)" }}
              >
                Both dormant filings.
                <br />
                Two minutes.
                <br />
                <span style={{ color: "var(--color-primary)" }}>£19 a year.</span>
              </h1>
              <p
                className="text-lg leading-relaxed mb-8"
                style={{ color: "var(--color-text-body)" }}
              >
                Annual accounts to Companies House and nil CT600 returns to HMRC — filed directly
                via official APIs. No accounting knowledge needed.
              </p>

              <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-cta)",
                    color: "var(--color-bg-card)",
                    padding: "14px 28px",
                  }}
                >
                  {isFilingLive() ? "Start filing" : "Set up your account"} <ArrowRight size={18} />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-2 text-base font-medium rounded-lg transition-colors duration-200 cursor-pointer"
                  style={{
                    color: "var(--color-primary)",
                    padding: "14px 28px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-card)",
                  }}
                >
                  See how it works
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start">
                <MicroTrust icon={Shield} text="Official government APIs" />
                <MicroTrust icon={KeyRound} text="Credentials never stored" />
              </div>

              {!isFilingLive() && (
                <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Filing opens soon — set up now so you&apos;re ready on day one.
                </p>
              )}
            </div>

            {/* Product preview */}
            <div className="relative hidden lg:block">
              <BrowserFrame>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      ACME HOLDINGS LTD
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Company #12345678
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "var(--color-primary-bg)",
                      color: "var(--color-primary)",
                    }}
                  >
                    Dormant
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: "Annual Accounts", org: "Companies House" },
                    { label: "CT600 Return", org: "HMRC" },
                  ].map((filing) => (
                    <div
                      key={filing.label}
                      className="flex items-center justify-between p-3.5 rounded-lg"
                      style={{
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-bg-inset)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck
                          size={18}
                          style={{ color: "var(--color-success)", flexShrink: 0 }}
                        />
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {filing.label}
                          </p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {filing.org}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-md"
                        style={{
                          backgroundColor: "rgba(21, 128, 61, 0.08)",
                          color: "var(--color-success)",
                        }}
                      >
                        Filed
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Clock size={14} style={{ color: "var(--color-text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Both filed in 1m 47s
                  </p>
                </div>
              </BrowserFrame>

              {/* Price comparison floating badge */}
              <div
                className="absolute -bottom-4 -left-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
                  color: "var(--color-text-primary)",
                }}
              >
                <span className="line-through" style={{ color: "var(--color-text-muted)" }}>
                  £100+
                </span>
                <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>£19/yr</span>
              </div>
            </div>
          </div>

          {/* Dormant-only disclaimer */}
          <p className="text-center mt-12 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            For genuinely dormant companies only — no trading activity, no assets, no income.
          </p>
        </div>
      </section>

      {/* How we compare */}
      <section
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
        }}
        className="py-16 px-6"
      >
        <div className="max-w-[960px] mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
          >
            Not another accounting tool
          </h2>
          <p className="text-sm text-center mb-10" style={{ color: "var(--color-text-secondary)" }}>
            Your options for filing a dormant company&apos;s returns.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Accountant */}
            <div
              className="rounded-xl p-6"
              style={{
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-page)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Briefcase size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Your accountant
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Typically £150+/yr",
                  "Wait days for them to file",
                  "Paying for expertise you don\u2019t need",
                  "Overkill for a dormant company",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "var(--color-text-muted)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Accounting software */}
            <div
              className="rounded-xl p-6"
              style={{
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-page)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Monitor size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Accounting software
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Typically £50+/yr",
                  "Hours to set up and learn",
                  "Built for trading companies",
                  "Features you\u2019ll never touch",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "var(--color-text-muted)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* DormantFile — highlighted */}
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: "var(--color-primary)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Zap size={18} style={{ color: "rgba(255,255,255,0.7)", flexShrink: 0 }} />
                <p className="text-sm font-semibold text-white">DormantFile</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "From £19/yr",
                  "Both filings in under 2 minutes",
                  "Purpose-built for dormant companies",
                  "Direct to government APIs",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: "rgba(255,255,255,0.9)" }}
                  >
                    <CheckCircle
                      size={16}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-[960px] mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
          >
            Three steps. Under two minutes.
          </h2>
          <p className="text-sm text-center mb-12" style={{ color: "var(--color-text-secondary)" }}>
            From company number to filed returns — here&apos;s the whole process.
          </p>

          <div className="max-w-2xl mx-auto">
            {[
              {
                icon: Search,
                time: "~30 seconds",
                heading: "Look up your company",
                description:
                  "Type your company number. We pull your name, incorporation date, and filing history from Companies House automatically.",
              },
              {
                icon: Bell,
                time: "Automatic",
                heading: "We watch your deadlines",
                description:
                  "Email reminders at 90, 30, 14, 7, 3, and 1 day before each filing is due. We calculate the dates — you just show up.",
              },
              {
                icon: Send,
                time: "~1 minute",
                heading: "File both returns",
                description:
                  "Confirm your details and submit. Dormant accounts go to Companies House and your nil CT600 goes to HMRC — both via official APIs.",
              },
            ].map((step, i, arr) => (
              <div key={step.heading} className="flex gap-5 sm:gap-7">
                {/* Timeline node + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: "var(--color-primary-bg)",
                      border: "2px solid var(--color-primary-border)",
                    }}
                  >
                    <step.icon size={18} style={{ color: "var(--color-primary)" }} />
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className="w-px flex-1 mt-0"
                      style={{ backgroundColor: "var(--color-border)" }}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  style={{ paddingBottom: i < arr.length - 1 ? "2.5rem" : 0 }}
                  className="pt-1.5 flex-1 min-w-0"
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3
                      className="font-semibold text-base"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {step.heading}
                    </h3>
                    <span
                      className="text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: "var(--color-bg-inset)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {step.time}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
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
        style={{
          backgroundColor: "var(--color-primary-bg)",
          borderTop: "1px solid var(--color-primary-border)",
          borderBottom: "1px solid var(--color-primary-border)",
        }}
        className="py-20 px-6"
      >
        <div className="max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* The problem */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--color-warning)" }}
              >
                31 March 2026
              </p>
              <h2
                className="text-2xl font-bold leading-snug mb-4"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
              >
                Your free CT600 tool is gone.
                <br />
                Your filing obligations aren&apos;t.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-body)" }}>
                HMRC shut down CATO — the only free way to file a Corporation Tax return. If
                you&apos;re a director of a dormant company, you still need to file every year or
                face penalties.
              </p>
            </div>

            {/* What to do about it */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-4"
                style={{ color: "var(--color-primary)" }}
              >
                What you still need to file
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <FileCheck
                    size={18}
                    style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "2px" }}
                  />
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Annual accounts
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      To Companies House — every year, for every company
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileCheck
                    size={18}
                    style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "2px" }}
                  />
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Nil CT600 return
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      To HMRC — every year, if registered for Corporation Tax
                    </p>
                  </div>
                </div>
              </div>
              <p
                className="text-sm font-semibold mb-5"
                style={{ color: "var(--color-text-primary)" }}
              >
                DormantFile handles both. From £19/yr.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: "var(--color-cta)",
                  color: "var(--color-bg-card)",
                  padding: "12px 24px",
                }}
              >
                {isFilingLive() ? "Start filing" : "Get started"} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-[960px] mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
          >
            Both filings. From £19 a year.
          </h2>
          <p
            className="text-sm text-center mb-12 max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Every plan includes annual accounts and CT600. No add-ons, no hidden fees.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Basic",
                price: "19",
                period: "per year",
                perUnit: null,
                description: "You have one dormant company on the register.",
                features: [
                  "Annual accounts to Companies House",
                  "Nil CT600 return to HMRC",
                  "File any outstanding period",
                  "Email deadline reminders",
                  "Direct submission via official APIs",
                ],
                cta: "Get started",
                highlighted: false,
              },
              {
                name: "Multiple",
                price: "39",
                period: "per year",
                perUnit: "£3.90 per company",
                description:
                  "Side projects, holding structures, or a few companies on the register.",
                features: [
                  "Accounts + CT600 for up to 10 companies",
                  "One dashboard — all companies at a glance",
                  "File any outstanding period per company",
                  "Email deadline reminders for every company",
                  "Direct submission via official APIs",
                ],
                cta: "Get started",
                highlighted: true,
              },
              {
                name: "Agent",
                price: "49",
                period: "per year",
                perUnit: "49p per company",
                description: "For accountants and formation agents filing on behalf of clients.",
                features: [
                  "Accounts + CT600 for up to 100 companies",
                  "File as agent on behalf of your clients",
                  "One dashboard — all clients at a glance",
                  "File any outstanding period per company",
                  "Email deadline reminders for every company",
                ],
                cta: "Get started",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl p-5 sm:p-7 flex flex-col"
                style={{
                  border: plan.highlighted
                    ? "2px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
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
                  <span
                    className="text-4xl font-bold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    £{plan.price}
                  </span>
                  <span className="text-sm ml-1" style={{ color: "var(--color-text-secondary)" }}>
                    {plan.period}
                  </span>
                </div>
                {plan.perUnit && (
                  <p className="text-xs font-medium mb-4" style={{ color: "var(--color-primary)" }}>
                    {plan.perUnit}
                  </p>
                )}
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{
                    color: "var(--color-text-secondary)",
                    marginTop: plan.perUnit ? 0 : "0.5rem",
                  }}
                >
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
                  className="block w-full text-center font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer"
                  style={{
                    backgroundColor: plan.highlighted ? "var(--color-cta)" : "var(--color-primary)",
                    color: "var(--color-bg-card)",
                    padding: "12px 24px",
                  }}
                >
                  {plan.cta}
                </Link>
                <div className="mt-3 text-center">
                  <MicroTrust icon={RotateCcw} text="14-day refund guarantee" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-6" style={{ color: "var(--color-text-muted)" }}>
            Compare to £100+ for most accounting software. All plans include
            credentials-never-stored security.
          </p>
        </div>
      </section>

      {/* Trust Section */}
      <TrustSection>
        <FilingCounter />
        <TrustBadges />
      </TrustSection>

      {/* Testimonials (hidden until populated) */}
      <Testimonials />

      {/* FAQ */}
      <FAQPageJsonLd items={faqItems} />
      <section
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderTop: "1px solid var(--color-border)",
        }}
        className="py-20 px-6"
      >
        <div className="max-w-[960px] mx-auto">
          <h2
            className="text-2xl font-bold text-center mb-3"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
          >
            You&apos;re probably wondering
          </h2>
          <p className="text-sm text-center mb-12" style={{ color: "var(--color-text-secondary)" }}>
            The things we&apos;d want to know before signing up.{" "}
            <Link
              href="/faq"
              className="font-medium transition-colors duration-200"
              style={{ color: "var(--color-primary)" }}
            >
              See all FAQs &rarr;
            </Link>
          </p>
          <div className="max-w-3xl mx-auto" style={{ borderTop: "1px solid var(--color-border)" }}>
            {faqItems.map(({ question, answer }, i) => (
              <div
                key={question}
                className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 lg:gap-10 py-8"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <div className="flex gap-4">
                  <span
                    className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: "var(--color-border)", marginTop: "2px" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="text-base font-semibold leading-snug text-balance"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {question}
                  </h3>
                </div>
                <p
                  className="text-sm leading-relaxed lg:pt-1 ml-[3.25rem] lg:ml-0"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="py-20 sm:py-24 px-6"
        style={{
          backgroundColor: "var(--color-primary-bg)",
          borderTop: "1px solid var(--color-primary-border)",
          borderBottom: "1px solid var(--color-primary-border)",
        }}
      >
        <div className="max-w-[960px] mx-auto">
          {/* Value stat blocks */}
          <div className="grid grid-cols-3 gap-3 sm:gap-5 max-w-sm sm:max-w-md mx-auto mb-12">
            {[
              { value: "£19", unit: "/yr", label: "From" },
              { value: "2", unit: " min", label: "Under" },
              { value: "2", unit: "", label: "Filings" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center rounded-xl py-4 px-2"
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {stat.label}
                </p>
                <p
                  className="text-2xl sm:text-3xl font-bold leading-none"
                  style={{ color: "var(--color-primary)" }}
                >
                  {stat.value}
                  {stat.unit && (
                    <span
                      className="text-base sm:text-lg font-medium"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {stat.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Headline + sub */}
          <h2
            className="text-3xl sm:text-4xl font-bold text-center leading-tight mb-5"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}
          >
            Get your dormant filings sorted.
          </h2>
          <p
            className="text-base sm:text-lg text-center leading-relaxed mb-10 max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Set up your company in minutes. When it&apos;s time to file, both returns go directly to
            Companies House and HMRC. From £19 a year.
          </p>

          {/* CTA */}
          <div className="text-center mb-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "var(--color-bg-card)",
                padding: "16px 36px",
              }}
            >
              {isFilingLive() ? "Start filing today" : "Get ready to file"} <ArrowRight size={18} />
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { icon: Shield, text: "Official government APIs" },
              { icon: KeyRound, text: "Credentials never stored" },
              { icon: RotateCcw, text: "14-day refund guarantee" },
            ].map((item) => (
              <span
                key={item.text}
                className="inline-flex items-center gap-1.5 text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                <item.icon size={12} strokeWidth={2} />
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter variant="marketing" />
    </div>
  );
}
