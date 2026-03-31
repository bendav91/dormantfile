import { cn } from "@/lib/cn";
import { BrowserFrame } from "@/components/marketing/BrowserFrame";
import { FilingCounter } from "@/components/marketing/FilingCounter";
import { SiteFooter } from "@/components/SiteFooter";
import { MicroTrust } from "@/components/marketing/MicroTrust";
import { AggregateRating } from "@/components/marketing/AggregateRating";
import { AggregateRatingJsonLd } from "@/lib/content/json-ld";
import { getReviewStats } from "@/lib/reviews";
import { TrustBadges } from "@/components/marketing/TrustBadges";
import { TrustSection } from "@/components/marketing/TrustSection";
import { SiteNav } from "@/components/SiteNav";
import { VideoPlayer } from "@/components/marketing/VideoPlayer";
import { FAQPageJsonLd } from "@/lib/content/json-ld";
import { isFilingLive } from "@/lib/launch-mode";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle,
  Clock,
  FileCheck,
  History,
  KeyRound,
  Monitor,
  RefreshCw,
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

async function ReviewsJsonLdSection() {
  const stats = await getReviewStats();
  if (!stats) return null;
  return <AggregateRatingJsonLd avgRating={stats.avgRating} reviewCount={stats.reviewCount} />;
}

export default function LandingPage() {
  return (
    <div
      className={`${ibmPlexSans.className} bg-page text-foreground`}
    >
      {/* Navigation */}
      <SiteNav variant="marketing" />

      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-20 sm:pb-28 px-6">
        <div className="max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-5 text-foreground">
                Both dormant filings.
                <br />
                Two minutes.
                <br />
                <span className="text-primary">£19 a year.</span>
              </h1>
              <p className="text-lg leading-relaxed mb-8 text-body">
                Annual accounts to Companies House and nil CT600 returns to HMRC — filed directly
                via official APIs. No accounting knowledge needed.
              </p>

              <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer bg-cta text-card px-7 py-3.5"
                >
                  {isFilingLive() ? "Start filing" : "Set up your account"} <ArrowRight size={18} />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-2 text-base font-medium rounded-lg transition-colors duration-200 cursor-pointer text-primary px-7 py-3.5 border border-border bg-card"
                >
                  See how it works
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start">
                <MicroTrust icon={Shield} text="Official government APIs" />
                <MicroTrust icon={KeyRound} text="Credentials never stored" />
              </div>

              <div className="flex justify-center lg:justify-start mt-3">
                <AggregateRating variant="inline" />
              </div>

              {!isFilingLive() && (
                <p className="mt-4 text-xs text-muted">
                  Filing opens soon — set up now so you&apos;re ready on day one.
                </p>
              )}
            </div>

            {/* Product preview */}
            <div className="relative hidden lg:block">
              <BrowserFrame>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      ACME HOLDINGS LTD
                    </p>
                    <p className="text-xs mt-0.5 text-muted">
                      Company #12345678
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-bg text-primary">
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
                      className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-inset"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck
                          size={18}
                          className="text-success shrink-0"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {filing.label}
                          </p>
                          <p className="text-xs text-muted">
                            {filing.org}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-success-bg text-success">
                        Filed
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Clock size={14} className="text-muted" />
                  <p className="text-xs text-muted">
                    Both filed in 1m 47s
                  </p>
                </div>
              </BrowserFrame>

              {/* Price comparison floating badge */}
              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-card border border-border shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-foreground">
                <span className="line-through text-muted">
                  £100+
                </span>
                <span className="text-primary font-bold">£19/yr</span>
              </div>
            </div>
          </div>

          {/* Dormant-only disclaimer */}
          <p className="text-center mt-12 text-sm text-secondary">
            For genuinely dormant companies only — no trading activity, no assets, no income.
          </p>
        </div>
      </section>

      {/* How we compare */}
      <section className="py-16 px-6 bg-card border-t border-b border-border">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]">
            Not another accounting tool
          </h2>
          <p className="text-sm text-center mb-10 text-secondary">
            Your options for filing a dormant company&apos;s returns.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Accountant */}
            <div className="rounded-xl p-6 border border-border bg-page">
              <div className="flex items-center gap-2.5 mb-4">
                <Briefcase size={18} className="text-muted shrink-0" />
                <p className="text-sm font-semibold text-foreground">
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
                    className="flex items-start gap-2.5 text-sm text-secondary"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-muted" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Accounting software */}
            <div className="rounded-xl p-6 border border-border bg-page">
              <div className="flex items-center gap-2.5 mb-4">
                <Monitor size={18} className="text-muted shrink-0" />
                <p className="text-sm font-semibold text-foreground">
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
                    className="flex items-start gap-2.5 text-sm text-secondary"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-muted" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* DormantFile — highlighted */}
            <div className="rounded-xl p-6 bg-primary">
              <div className="flex items-center gap-2.5 mb-4">
                <Zap size={18} className="text-white/70 shrink-0" />
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
                    className="flex items-start gap-2.5 text-sm text-white/90"
                  >
                    <CheckCircle
                      size={16}
                      className="mt-0.5 shrink-0 text-white/70"
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
          <h2 className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]">
            Three steps. Under two minutes.
          </h2>
          <p className="text-sm text-center mb-12 text-secondary">
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
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary-bg border-2 border-primary-border">
                    <step.icon size={18} className="text-primary" />
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 mt-0 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={`pt-1.5 flex-1 min-w-0 ${i < arr.length - 1 ? "pb-10" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-semibold text-base text-foreground">
                      {step.heading}
                    </h3>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 bg-inset text-muted">
                      {step.time}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-secondary">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-8">
            <Link
              href="/how-it-works"
              className="text-sm font-medium transition-colors duration-200 text-primary"
            >
              See the full walkthrough &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Behind the scenes */}
      <section className="py-20 px-6 bg-card border-t border-b border-border">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]">
            More than a filing form
          </h2>
          <p className="text-sm text-center mb-12 text-secondary">
            Here&apos;s what&apos;s working behind the scenes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: History,
                heading: "Filing history from day one",
                description:
                  "We check Companies House for every unfiled period since your company was incorporated. Nothing slips through.",
              },
              {
                icon: Bell,
                heading: "Deadline intelligence",
                description:
                  "Reminders at 90, 30, 14, 7, 3, and 1 day before each filing is due \u2014 with penalty amounts so you know the stakes.",
              },
              {
                icon: RefreshCw,
                heading: "Keeps itself current",
                description:
                  "Your company data is synced against Companies House daily. Periods filed elsewhere are detected and marked automatically.",
              },
            ].map((item) => (
              <div key={item.heading} className="text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary-bg border-2 border-primary-border">
                  <item.icon size={18} className="text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-foreground">
                  {item.heading}
                </h3>
                <p className="text-sm leading-relaxed text-secondary">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center mt-8">
            <Link
              href="/features"
              className="text-sm font-medium transition-colors duration-200 text-primary"
            >
              See all features &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Video Explainer */}
      <section className="py-20 px-6 bg-card border-t border-b border-border">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]">
            See it in action
          </h2>
          <p className="text-sm text-center mb-10 text-secondary">
            A complete filing walkthrough in under two minutes.
          </p>
          <div className="max-w-3xl mx-auto">
            <VideoPlayer src="/dormantfile-explainer.mp4" />
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 px-6 bg-primary-bg border-t border-b border-primary-border">
        <div className="max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* The problem */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-warning">
                31 March 2026
              </p>
              <h2 className="text-2xl font-bold leading-snug mb-4 text-foreground tracking-[-0.02em]">
                Your free CT600 tool is gone.
                <br />
                Your filing obligations aren&apos;t.
              </h2>
              <p className="text-sm leading-relaxed text-body">
                HMRC shut down CATO — the only free way to file a Corporation Tax return. If
                you&apos;re a director of a dormant company, you still need to file every year or
                face penalties.
              </p>
            </div>

            {/* What to do about it */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-4 text-primary">
                What you still need to file
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <FileCheck
                    size={18}
                    className="text-primary shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Annual accounts
                    </p>
                    <p className="text-xs text-secondary">
                      To Companies House — every year, for every company
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileCheck
                    size={18}
                    className="text-primary shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Nil CT600 return
                    </p>
                    <p className="text-xs text-secondary">
                      To HMRC — every year, if registered for Corporation Tax
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold mb-5 text-foreground">
                DormantFile handles both. From £19/yr.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer bg-cta text-card px-6 py-3"
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
          <h2 className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]">
            Both filings. From £19 a year.
          </h2>
          <p className="text-sm text-center mb-12 max-w-lg mx-auto text-secondary">
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
                  "Automatic gap detection from incorporation",
                  "Deadline reminders with penalty warnings",
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
                  "Portfolio dashboard with filtering and search",
                  "Automatic gap detection per company",
                  "Deadline reminders with penalty warnings",
                  "All companies synced daily with Companies House",
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
                  "Portfolio dashboard with filtering and search",
                  "Automatic gap detection per company",
                  "Deadline reminders across all client companies",
                ],
                cta: "Get started",
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "rounded-xl p-5 sm:p-7 flex flex-col bg-card relative",
                  plan.highlighted ? "border-2 border-primary" : "border border-border"
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-card px-3.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                    Most popular
                  </span>
                )}
                <p className="font-semibold text-sm mb-1 text-primary">
                  {plan.name}
                </p>
                <div className="mb-1">
                  <span className="text-4xl font-bold text-foreground">
                    £{plan.price}
                  </span>
                  <span className="text-sm ml-1 text-secondary">
                    {plan.period}
                  </span>
                </div>
                {plan.perUnit && (
                  <p className="text-xs font-medium mb-4 text-primary">
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
                    "block w-full text-center font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer text-card px-6 py-3",
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

      {/* Reviews JSON-LD */}
      <ReviewsJsonLdSection />

      {/* FAQ */}
      <FAQPageJsonLd items={faqItems} />
      <section className="py-20 px-6 bg-card border-t border-border">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]">
            You&apos;re probably wondering
          </h2>
          <p className="text-sm text-center mb-12 text-secondary">
            The things we&apos;d want to know before signing up.{" "}
            <Link
              href="/faq"
              className="font-medium transition-colors duration-200 text-primary"
            >
              See all FAQs &rarr;
            </Link>
          </p>
          <div className="max-w-3xl mx-auto border-t border-border">
            {faqItems.map(({ question, answer }, i) => (
              <div
                key={question}
                className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 lg:gap-10 py-8 border-b border-border"
              >
                <div className="flex gap-4">
                  <span className="text-2xl font-bold tabular-nums leading-none text-border mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-semibold leading-snug text-balance text-foreground">
                    {question}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed lg:pt-1 ml-[3.25rem] lg:ml-0 text-secondary">
                  {answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-24 px-6 bg-primary-bg border-t border-b border-primary-border">
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
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1.5 text-muted">
                  {stat.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold leading-none text-primary">
                  {stat.value}
                  {stat.unit && (
                    <span className="text-base sm:text-lg font-medium text-secondary">
                      {stat.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Headline + sub */}
          <h2 className="text-3xl sm:text-4xl font-bold text-center leading-tight mb-5 text-foreground tracking-[-0.025em]">
            Get your dormant filings sorted.
          </h2>
          <p className="text-base sm:text-lg text-center leading-relaxed mb-10 max-w-lg mx-auto text-secondary">
            Set up your company in minutes. When it&apos;s time to file, both returns go directly to
            Companies House and HMRC. From £19 a year.
          </p>

          {/* CTA */}
          <div className="text-center mb-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer bg-cta text-card px-9 py-4"
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
                className="inline-flex items-center gap-1.5 text-xs text-muted"
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
