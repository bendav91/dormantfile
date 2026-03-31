import { cn } from "@/lib/cn";
import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { MicroTrust } from "@/components/marketing/MicroTrust";
import { ReviewCTA } from "@/components/marketing/ReviewCTA";
import { BreadcrumbJsonLd, HowToJsonLd } from "@/lib/content/json-ld";
import { isFilingLive } from "@/lib/launch-mode";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle,
  CreditCard,
  FileCheck,
  KeyRound,
  Mail,
  RotateCcw,
  Send,
  Shield,
  UserPlus,
} from "lucide-react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "How Dormant Company Filing Works",
  description:
    "Step-by-step guide to filing dormant company accounts and a nil CT600 return with DormantFile.",
  alternates: { canonical: `${BASE_URL}/how-it-works` },
  openGraph: {
    title: "How Dormant Company Filing Works | DormantFile",
    description:
      "Step-by-step guide to filing dormant company accounts and a nil CT600 return with DormantFile.",
    type: "website",
    siteName: "DormantFile",
  },
};

const howToSteps = [
  { name: "Create your account", text: "Sign up with your email address and set a password." },
  {
    name: "Add your company",
    text: "Enter your company registration number. We look up the company name from Companies House. Add your UTR and accounting period dates.",
  },
  {
    name: "Choose your plan",
    text: "Pick Basic for one company, Multiple for up to 10, or Agent for up to 100.",
  },
  {
    name: "Get deadline reminders",
    text: "We calculate your filing deadlines and send email reminders at 90, 30, 14, 7, 3, and 1 day before they are due.",
  },
  {
    name: "File your accounts",
    text: "Submit dormant accounts to Companies House. Enter your authentication code and we handle the rest.",
  },
  {
    name: "File your CT600",
    text: "Submit a nil CT600 to HMRC. Enter your Government Gateway credentials — used once and never stored.",
  },
  {
    name: "Get confirmation",
    text: "Once accepted, we show confirmation in your dashboard and send you an email.",
  },
];

export default function HowItWorksPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div
      className={`${ibmPlexSans.className} bg-page text-foreground`}
    >
      <BreadcrumbJsonLd items={[{ name: "Home", url: baseUrl }, { name: "How It Works" }]} />
      <HowToJsonLd
        name="How to file dormant company accounts and nil CT600 returns"
        description="Step-by-step guide to filing for a dormant UK limited company using DormantFile."
        steps={howToSteps}
      />

      <SiteNav variant="marketing" />

      <main id="main-content">
        {/* ── Hero ── */}
        <section className="pt-16 sm:pt-24 pb-16 sm:pb-20 px-6">
          <div className="max-w-[960px] mx-auto text-center">
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex items-center justify-center gap-2 text-sm list-none p-0 m-0">
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
                  <span className="text-body">How It Works</span>
                </li>
              </ol>
            </nav>

            <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-5 text-foreground">
              How DormantFile works
            </h1>
            <p className="text-lg leading-relaxed max-w-xl mx-auto mb-12 text-body">
              From sign-up to filed — the whole process takes under five minutes. Three phases, two
              filings, zero accounting knowledge.
            </p>

            {/* Stat badges */}
            <div className="grid grid-cols-3 gap-3 sm:gap-5 max-w-sm sm:max-w-md mx-auto">
              {[
                { label: "Set up", value: "30", unit: " sec" },
                { label: "Reminders", value: "Auto", unit: "" },
                { label: "Filing", value: "~2", unit: " min" },
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
          </div>
        </section>

        {/* ── Phase 1: Get set up ── */}
        <section className="py-16 sm:py-20 px-6 bg-card border-t border-b border-border">
          <div className="max-w-[960px] mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary-bg border-2 border-primary-border">
                <span className="text-base font-bold text-primary">
                  1
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground tracking-[-0.02em]">
                  Get set up
                </h2>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-inset text-muted">
                  ~2 minutes
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-8 ml-14 text-secondary">
              Create an account, add your company, and pick a plan. That&apos;s it.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: UserPlus,
                  title: "Create your account",
                  description:
                    "Sign up with your email address and set a password. Takes about 30 seconds.",
                },
                {
                  icon: Building2,
                  title: "Add your company",
                  description:
                    "Enter your company number \u2014 we pull the name, incorporation date, and filing history from Companies House automatically. Then add your UTR and accounting period dates.",
                },
                {
                  icon: CreditCard,
                  title: "Choose your plan",
                  description:
                    "Basic is \u00A319/year for one company. Multiple is \u00A339/year for up to 10. Agent is \u00A349/year for up to 100.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="rounded-xl p-5 bg-page border border-border"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-primary-bg">
                    <step.icon size={18} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-1.5 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-secondary">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Phase 2: Deadline reminders ── */}
        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-[960px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              {/* Copy */}
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary-bg border-2 border-primary-border">
                    <span className="text-base font-bold text-primary">
                      2
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-foreground tracking-[-0.02em]">
                      We watch your deadlines
                    </h2>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-inset text-muted">
                      Automatic
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-6 ml-14 text-secondary">
                  We calculate your filing deadlines automatically — nine months after your
                  accounting reference date for accounts, twelve months for CT600. You get email
                  reminders so you never miss a deadline.
                </p>
                <div className="ml-14">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2.5 text-muted">
                    Reminders sent at
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["90 days", "30 days", "14 days", "7 days", "3 days", "1 day"].map((d) => (
                      <span
                        key={d}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-inset text-secondary border border-border"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Email mockup */}
              <div>
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <div className="px-4 py-3 flex items-center gap-3 bg-inset border-b border-border">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary-bg">
                      <Mail size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Filing deadline in 30 days
                      </p>
                      <p className="text-xs text-muted">
                        from DormantFile
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm leading-relaxed text-body">
                      Your annual accounts for{" "}
                      <strong className="text-foreground">
                        ACME HOLDINGS LTD
                      </strong>{" "}
                      are due on{" "}
                      <strong className="text-foreground">28 April 2026</strong>.
                    </p>
                    <p className="text-xs mt-3 text-muted">
                      Log in to your dashboard to file now &rarr;
                    </p>
                  </div>
                </div>

                {/* Stacked second notification */}
                <div className="rounded-xl overflow-hidden mt-3 border border-border bg-card opacity-70">
                  <div className="px-4 py-2.5 flex items-center gap-3 bg-inset">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-warning-bg">
                      <Bell size={12} className="text-warning" />
                    </div>
                    <p className="text-xs font-medium text-secondary">
                      CT600 return due in 7 days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Phase 3: File and confirm ── */}
        <section className="py-16 sm:py-20 px-6 bg-card border-t border-b border-border">
          <div className="max-w-[960px] mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary-bg border-2 border-primary-border">
                <span className="text-base font-bold text-primary">
                  3
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground tracking-[-0.02em]">
                  File and confirm
                </h2>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-inset text-muted">
                  ~2 minutes
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-10 ml-14 text-secondary">
              Confirm your details and submit. Both filings go directly to the government via
              official APIs.
            </p>

            {/* Timeline */}
            <div className="max-w-2xl mx-auto">
              {[
                {
                  icon: Send,
                  heading: "File your accounts",
                  description:
                    "Submit your dormant accounts to Companies House. Enter your authentication code and we generate the iXBRL document and submit via the Companies House software filing API.",
                },
                {
                  icon: Send,
                  heading: "File your CT600",
                  description:
                    "Submit a nil CT600 to HMRC. Enter your Government Gateway credentials \u2014 they\u2019re used once at submission and immediately discarded. We file directly via HMRC\u2019s GovTalk API.",
                },
                {
                  icon: CheckCircle,
                  heading: "Get confirmation",
                  description:
                    "Once your filing is accepted, we show confirmation in your dashboard and send you an email. Filing records are stored so you always have a history.",
                },
              ].map((step, i, arr) => (
                <div key={step.heading} className="flex gap-5 sm:gap-7">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary-bg border-2 border-primary-border">
                      <step.icon size={18} className="text-primary" />
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-px flex-1 mt-0 bg-border" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "pt-1.5 flex-1 min-w-0",
                      i < arr.length - 1 ? "pb-10" : ""
                    )}
                  >
                    <h3 className="font-semibold text-base mb-1.5 text-foreground">
                      {step.heading}
                    </h3>
                    <p className="text-sm leading-relaxed text-secondary">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── See it in action ── */}
        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-[960px] mx-auto">
            <h2 className="text-2xl font-bold text-center mb-3 text-foreground tracking-[-0.02em]">
              See it in action
            </h2>
            <p className="text-sm text-center mb-10 text-secondary">
              A walkthrough of the actual DormantFile dashboard.
            </p>
            <ProductPreview />
          </div>
        </section>

        {/* ── Security ── */}
        <section className="py-16 sm:py-20 px-6 bg-primary-bg border-t border-b border-primary-border">
          <div className="max-w-[960px] mx-auto text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 bg-card border border-border">
              <Shield size={20} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground tracking-[-0.02em]">
              Your credentials stay yours
            </h2>
            <p className="text-sm mb-8 max-w-lg mx-auto text-secondary">
              We never store your HMRC or Companies House login details. Here&apos;s exactly how it
              works.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="rounded-xl p-5 bg-card border border-border">
                <KeyRound size={18} className="mb-3 text-primary" />
                <h3 className="font-semibold text-sm mb-1.5 text-foreground">
                  Government Gateway
                </h3>
                <p className="text-sm leading-relaxed text-secondary">
                  Your credentials are used once at submission and immediately discarded. Never
                  stored, never logged.
                </p>
              </div>
              <div className="rounded-xl p-5 bg-card border border-border">
                <Shield size={18} className="mb-3 text-primary" />
                <h3 className="font-semibold text-sm mb-1.5 text-foreground">
                  Authentication code
                </h3>
                <p className="text-sm leading-relaxed text-secondary">
                  Your Companies House auth code is used in-session to sign the submission.
                  It&apos;s never persisted.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Callouts ── */}
        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-[960px] mx-auto space-y-4">
            <div className="rounded-xl p-5 sm:p-6 bg-card border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-warning-bg">
                  <AlertCircle size={18} className="text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5 text-foreground">
                    Behind on your filings?
                  </h3>
                  <p className="text-sm leading-relaxed text-secondary">
                    DormantFile shows all outstanding periods for your company. File them one at a
                    time, starting from the oldest, and your company will be brought up to date.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-5 sm:p-6 bg-card border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary-bg">
                  <FileCheck size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5 text-foreground">
                    Not registered for Corporation Tax?
                  </h3>
                  <p className="text-sm leading-relaxed text-secondary">
                    No problem. Accounts and CT600 are independent filings — you can file one
                    without the other. Many dormant companies only need to file annual accounts.{" "}
                    <Link
                      href="/guides/do-i-need-ct600-dormant-company"
                      className="font-medium hover:underline focus-ring rounded text-primary"
                    >
                      Read our guide &rarr;
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 sm:py-24 px-6 bg-primary-bg border-t border-b border-primary-border">
          <div className="max-w-[960px] mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-5 text-foreground tracking-[-0.025em]">
              Ready to get started?
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto text-secondary">
              Set up your company in minutes. When it&apos;s time to file, both returns go directly
              to Companies House and HMRC. From &pound;19 a year.
            </p>
            <div className="mb-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer bg-cta text-card px-9 py-4"
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

        {/* Review CTA */}
        <section className="py-12 px-6">
          <div className="max-w-md mx-auto">
            <ReviewCTA />
          </div>
        </section>
      </main>

      <SiteFooter variant="marketing" />
    </div>
  );
}
