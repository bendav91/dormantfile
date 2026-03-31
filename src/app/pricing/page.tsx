import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MicroTrust } from "@/components/marketing/MicroTrust";
import { AggregateRating } from "@/components/marketing/AggregateRating";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";
import { cn } from "@/lib/cn";
import { isFilingLive } from "@/lib/launch-mode";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  ChevronDown,
  KeyRound,
  Monitor,
  RotateCcw,
  Shield,
  Zap,
} from "lucide-react";
import { FAQAccordion } from "./FAQAccordion";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Dormant Company Filing Pricing — From £19/yr",
  description:
    "DormantFile pricing: from £19/year for one dormant company. File annual accounts and nil CT600 returns from one dashboard.",
  alternates: { canonical: `${BASE_URL}/pricing` },
  openGraph: {
    title: "Dormant Company Filing Pricing — From £19/yr | DormantFile",
    description:
      "DormantFile pricing: from £19/year for one dormant company. Both filings, one dashboard.",
    type: "website",
    siteName: "DormantFile",
  },
};

const plans = [
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
    description: "Side projects, holding structures, or a few companies on the register.",
    features: [
      "Accounts + CT600 for up to 10 companies",
      "One dashboard \u2014 all companies at a glance",
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
      "One dashboard \u2014 all clients at a glance",
      "File any outstanding period per company",
      "Email deadline reminders for every company",
    ],
    cta: "Get started",
    highlighted: false,
  },
];

const faqItems = [
  {
    question: "Can I try before I commit?",
    answer:
      "You have a 14-day cooling-off period after subscribing. If you cancel within those 14 days and haven\u2019t submitted a filing, we issue a full refund.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel via the billing portal in your account settings. Your subscription stays active until the end of your current billing period.",
  },
  {
    question: "Can I upgrade or downgrade?",
    answer:
      "Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. Both are handled from your account settings.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards via Stripe. We don\u2019t currently accept bank transfers or direct debits.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "During the first 14 days you can cancel for a full refund, provided no filing has been submitted. After that, we don\u2019t refund partial billing periods \u2014 but your access continues until the period ends.",
  },
];

export default function PricingPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div
      className={cn(ibmPlexSans.className, "bg-page text-foreground")}
    >
      <BreadcrumbJsonLd items={[{ name: "Home", url: baseUrl }, { name: "Pricing" }]} />

      <SiteNav variant="marketing" />

      <main id="main-content">
        {/* ── Hero ── */}
        <section className="pt-16 sm:pt-24 pb-16 sm:pb-20 px-6">
          <div className="max-w-[960px] mx-auto text-center">
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol
                className="flex items-center justify-center gap-2 text-sm list-none p-0 m-0"
              >
                <li>
                  <Link
                    href="/"
                    className="hover:underline focus-ring rounded text-secondary no-underline"
                  >
                    Home
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                  <span className="text-body">Pricing</span>
                </li>
              </ol>
            </nav>

            <h1
              className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-5 text-foreground"
            >
              Both filings. <span className="text-primary">From £19 a year.</span>
            </h1>
            <p
              className="text-lg leading-relaxed max-w-xl mx-auto mb-6 text-body"
            >
              Every plan includes annual accounts and CT600. No add-ons, no hidden fees. Plans are
              based on how many companies you manage, not how many filings you make.
            </p>

            <a
              href="#plans"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 text-primary"
            >
              See plans <ChevronDown size={16} />
            </a>
          </div>
        </section>

        {/* ── Pricing Cards ── */}
        <section
          id="plans"
          className="py-16 sm:py-20 px-6 bg-card border-y border-border"
        >
          <div className="max-w-[960px] mx-auto">
            <div className="mb-8">
              <AggregateRating variant="centered" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "rounded-xl p-5 sm:p-7 flex flex-col bg-page relative",
                    plan.highlighted
                      ? "border-2 border-primary"
                      : "border border-border"
                  )}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-card px-3.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                      Most popular
                    </span>
                  )}
                  <p
                    className="font-semibold text-sm mb-1 text-primary"
                  >
                    {plan.name}
                  </p>
                  <div className="mb-1">
                    <span
                      className="text-4xl font-bold text-foreground"
                    >
                      £{plan.price}
                    </span>
                    <span className="text-sm ml-1 text-secondary">
                      {plan.period}
                    </span>
                  </div>
                  {plan.perUnit && (
                    <p
                      className="text-xs font-medium mb-4 text-primary"
                    >
                      {plan.perUnit}
                    </p>
                  )}
                  <p
                    className={cn(
                      "text-sm leading-relaxed mb-6 text-secondary",
                      !plan.perUnit && "mt-2"
                    )}
                  >
                    {plan.description}
                  </p>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckCircle
                          size={16}
                          className="text-primary shrink-0 mt-0.5"
                        />
                        <span className="text-sm text-body">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={cn(
                      "block w-full text-center font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer text-card py-3 px-6",
                      plan.highlighted ? "bg-cta" : "bg-primary"
                    )}
                  >
                    {plan.cta}
                  </Link>
                  <div className="mt-3 text-center">
                    <MicroTrust icon={RotateCcw} text="14-day refund guarantee" />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-center mt-6 text-muted">
              All plans include credentials-never-stored security. Your HMRC Gateway login is used
              once and immediately discarded.
            </p>
          </div>
        </section>

        {/* ── How we compare ── */}
        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-[960px] mx-auto">
            <h2
              className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]"
            >
              How we compare
            </h2>
            <p
              className="text-sm text-center mb-10 text-secondary"
            >
              Your options for filing a dormant company&apos;s returns.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* DormantFile — highlighted */}
              <div className="rounded-xl p-6 bg-primary">
                <div className="flex items-center gap-2.5 mb-4">
                  <Zap
                    size={18}
                    className="text-white/70 shrink-0"
                  />
                  <p className="text-sm font-semibold text-white">DormantFile</p>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  From £19
                  <span className="text-sm font-medium ml-1 text-white/70">
                    /yr
                  </span>
                </p>
                <p className="text-xs mb-4 text-white/70">
                  Under 2 minutes
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Both filings in under 2 minutes",
                    "Purpose-built for dormant companies",
                    "Direct to government APIs",
                    "Catch up on missed years",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-white/90"
                    >
                      <CheckCircle
                        size={16}
                        className="mt-0.5 flex-shrink-0 text-white/70"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Accountant */}
              <div className="rounded-xl p-6 border border-border bg-card">
                <div className="flex items-center gap-2.5 mb-4">
                  <Briefcase
                    size={18}
                    className="text-muted shrink-0"
                  />
                  <p className="text-sm font-semibold text-foreground">
                    Accountant
                  </p>
                </div>
                <p className="text-2xl font-bold mb-1 text-foreground">
                  £80–150+
                  <span className="text-sm font-medium ml-1 text-secondary">
                    /co
                  </span>
                </p>
                <p className="text-xs mb-4 text-muted">
                  Varies
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Professional advice included",
                    "Overkill for nil returns",
                    "Wait days for them to file",
                    "Paying for expertise you don\u2019t need",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-secondary"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Accounting software */}
              <div className="rounded-xl p-6 border border-border bg-card">
                <div className="flex items-center gap-2.5 mb-4">
                  <Monitor
                    size={18}
                    className="text-muted shrink-0"
                  />
                  <p className="text-sm font-semibold text-foreground">
                    Accounting software
                  </p>
                </div>
                <p className="text-2xl font-bold mb-1 text-foreground">
                  £100+
                  <span className="text-sm font-medium ml-1 text-secondary">
                    /yr
                  </span>
                </p>
                <p className="text-xs mb-4 text-muted">
                  30+ minutes
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Built for trading companies",
                    "Hours to set up and learn",
                    "Features you\u2019ll never touch",
                    "Not designed for dormant",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-secondary"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* DIY */}
              <div className="rounded-xl p-6 border border-border bg-card">
                <div className="flex items-center gap-2.5 mb-4">
                  <Shield
                    size={18}
                    className="text-muted shrink-0"
                  />
                  <p className="text-sm font-semibold text-foreground">
                    DIY (manual filing)
                  </p>
                </div>
                <p className="text-2xl font-bold mb-1 text-foreground">
                  Free
                  <span className="text-sm font-medium ml-1 text-secondary">
                    (accounts)
                  </span>
                </p>
                <p className="text-xs mb-4 text-muted">
                  1–2 hours
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Accounts only — no CT600",
                    "CATO closed on 31 March 2026",
                    "Error-prone without guidance",
                    "No deadline reminders",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-secondary"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── What's included ── */}
        <section
          className="py-16 sm:py-20 px-6 bg-card border-y border-border"
        >
          <div className="max-w-[960px] mx-auto">
            <h2
              className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]"
            >
              Every plan includes
            </h2>
            <p
              className="text-sm text-center mb-10 text-secondary"
            >
              No add-ons. No tiers for individual features. Everything below comes with every plan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Annual accounts",
                  description:
                    "Dormant accounts filed directly to Companies House via their software filing API.",
                },
                {
                  title: "Nil CT600 returns",
                  description: "Corporation Tax returns filed directly to HMRC via GovTalk.",
                },
                {
                  title: "Deadline reminders",
                  description:
                    "Email reminders at 90, 30, 14, 7, 3, and 1 day before each deadline.",
                },
                {
                  title: "Outstanding periods",
                  description:
                    "File any missed period, not just the current one. Catch up in a single sitting.",
                },
                {
                  title: "Filing history",
                  description:
                    "Every submission is recorded in your dashboard with confirmation details.",
                },
                {
                  title: "Credentials never stored",
                  description:
                    "Your HMRC Gateway login is used once at submission and immediately discarded.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 p-4 rounded-lg bg-page border border-border"
                >
                  <CheckCircle
                    size={18}
                    className="mt-0.5 flex-shrink-0 text-primary"
                  />
                  <div>
                    <h3
                      className="text-sm font-semibold mb-0.5 text-foreground"
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed text-secondary"
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-[960px] mx-auto">
            <h2
              className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]"
            >
              Billing questions
            </h2>
            <p
              className="text-sm text-center mb-10 text-secondary"
            >
              Everything you need to know about plans, billing, and refunds.{" "}
              <Link
                href="/faq"
                className="font-medium transition-colors duration-200 text-primary"
              >
                See all FAQs &rarr;
              </Link>
            </p>

            <div className="max-w-3xl mx-auto">
              <FAQAccordion items={faqItems} />
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="py-20 sm:py-24 px-6 bg-primary-bg border-y border-primary-border"
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
                  className="text-center rounded-xl py-4 px-2 bg-card border border-border"
                >
                  <p
                    className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1.5 text-muted"
                  >
                    {stat.label}
                  </p>
                  <p
                    className="text-2xl sm:text-3xl font-bold leading-none text-primary"
                  >
                    {stat.value}
                    {stat.unit && (
                      <span
                        className="text-base sm:text-lg font-medium text-secondary"
                      >
                        {stat.unit}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            <h2
              className="text-3xl sm:text-4xl font-bold text-center leading-tight mb-5 text-foreground tracking-[-0.025em]"
            >
              Get your dormant filings sorted.
            </h2>
            <p
              className="text-base sm:text-lg text-center leading-relaxed mb-10 max-w-lg mx-auto text-secondary"
            >
              Set up your company in minutes. When it&apos;s time to file, both returns go directly
              to Companies House and HMRC. From £19 a year.
            </p>

            <div className="text-center mb-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer bg-cta text-card py-4 px-9"
              >
                {isFilingLive() ? "Start filing today" : "Get started"} <ArrowRight size={18} />
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { icon: Shield, text: "Official government APIs" },
                { icon: KeyRound, text: "Credentials never stored" },
                { icon: RotateCcw, text: "14-day refund guarantee" },
              ].map((item) => (
                <MicroTrust key={item.text} icon={item.icon} text={item.text} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter variant="marketing" />
    </div>
  );
}
