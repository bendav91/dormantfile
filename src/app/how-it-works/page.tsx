import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { MicroTrust } from "@/components/marketing/MicroTrust";
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

export const metadata: Metadata = {
  title: "How It Works | DormantFile",
  description:
    "Step-by-step guide to filing dormant company accounts and a nil CT600 return with DormantFile.",
  openGraph: {
    title: "How It Works | DormantFile",
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
      className={ibmPlexSans.className}
      style={{ backgroundColor: "var(--color-bg-page)", color: "var(--color-text-primary)" }}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "How It Works" },
        ]}
      />
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
              <ol
                className="flex items-center justify-center gap-2 text-sm"
                style={{ listStyle: "none", padding: 0, margin: 0 }}
              >
                <li>
                  <Link
                    href="/"
                    className="hover:underline focus-ring rounded"
                    style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
                  >
                    Home
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" style={{ color: "var(--color-text-muted)" }}>
                    ›
                  </span>
                  <span style={{ color: "var(--color-text-body)" }}>How It Works</span>
                </li>
              </ol>
            </nav>

            <h1
              className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight mb-5"
              style={{ color: "var(--color-text-primary)" }}
            >
              How DormantFile works
            </h1>
            <p
              className="text-lg leading-relaxed max-w-xl mx-auto mb-12"
              style={{ color: "var(--color-text-body)" }}
            >
              From sign-up to filed — the whole process takes under five minutes.
              Three phases, two filings, zero accounting knowledge.
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
          </div>
        </section>

        {/* ── Phase 1: Get set up ── */}
        <section
          className="py-16 sm:py-20 px-6"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="max-w-[960px] mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: "var(--color-primary-bg)",
                  border: "2px solid var(--color-primary-border)",
                }}
              >
                <span
                  className="text-base font-bold"
                  style={{ color: "var(--color-primary)" }}
                >
                  1
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
                >
                  Get set up
                </h2>
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-bg-inset)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  ~2 minutes
                </span>
              </div>
            </div>
            <p
              className="text-sm leading-relaxed mb-8 ml-14"
              style={{ color: "var(--color-text-secondary)" }}
            >
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
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: "var(--color-bg-page)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: "var(--color-primary-bg)" }}
                  >
                    <step.icon size={18} style={{ color: "var(--color-primary)" }} />
                  </div>
                  <h3
                    className="font-semibold text-base mb-1.5"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
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
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: "var(--color-primary-bg)",
                      border: "2px solid var(--color-primary-border)",
                    }}
                  >
                    <span
                      className="text-base font-bold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      2
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2
                      className="text-2xl font-bold"
                      style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      We watch your deadlines
                    </h2>
                    <span
                      className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--color-bg-inset)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Automatic
                    </span>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed mb-6 ml-14"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  We calculate your filing deadlines automatically — nine months
                  after your accounting reference date for accounts, twelve months
                  for CT600. You get email reminders so you never miss a deadline.
                </p>
                <div className="ml-14">
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-2.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Reminders sent at
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["90 days", "30 days", "14 days", "7 days", "3 days", "1 day"].map(
                      (d) => (
                        <span
                          key={d}
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: "var(--color-bg-inset)",
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {d}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Email mockup */}
              <div>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-card)",
                  }}
                >
                  <div
                    className="px-4 py-3 flex items-center gap-3"
                    style={{
                      backgroundColor: "var(--color-bg-inset)",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "var(--color-primary-bg)" }}
                    >
                      <Mail size={14} style={{ color: "var(--color-primary)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        Filing deadline in 30 days
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        from DormantFile
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-body)" }}
                    >
                      Your annual accounts for{" "}
                      <strong style={{ color: "var(--color-text-primary)" }}>
                        ACME HOLDINGS LTD
                      </strong>{" "}
                      are due on{" "}
                      <strong style={{ color: "var(--color-text-primary)" }}>
                        28 April 2026
                      </strong>
                      .
                    </p>
                    <p
                      className="text-xs mt-3"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Log in to your dashboard to file now &rarr;
                    </p>
                  </div>
                </div>

                {/* Stacked second notification */}
                <div
                  className="rounded-xl overflow-hidden mt-3"
                  style={{
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-card)",
                    opacity: 0.7,
                  }}
                >
                  <div
                    className="px-4 py-2.5 flex items-center gap-3"
                    style={{ backgroundColor: "var(--color-bg-inset)" }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "var(--color-warning-bg)" }}
                    >
                      <Bell size={12} style={{ color: "var(--color-warning)" }} />
                    </div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      CT600 return due in 7 days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Phase 3: File and confirm ── */}
        <section
          className="py-16 sm:py-20 px-6"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="max-w-[960px] mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: "var(--color-primary-bg)",
                  border: "2px solid var(--color-primary-border)",
                }}
              >
                <span
                  className="text-base font-bold"
                  style={{ color: "var(--color-primary)" }}
                >
                  3
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className="text-2xl font-bold"
                  style={{
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  File and confirm
                </h2>
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-bg-inset)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  ~2 minutes
                </span>
              </div>
            </div>
            <p
              className="text-sm leading-relaxed mb-10 ml-14"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Confirm your details and submit. Both filings go directly to the
              government via official APIs.
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
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: "var(--color-primary-bg)",
                        border: "2px solid var(--color-primary-border)",
                      }}
                    >
                      <step.icon
                        size={18}
                        style={{ color: "var(--color-primary)" }}
                      />
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        className="w-px flex-1 mt-0"
                        style={{ backgroundColor: "var(--color-border)" }}
                      />
                    )}
                  </div>
                  <div
                    style={{ paddingBottom: i < arr.length - 1 ? "2.5rem" : 0 }}
                    className="pt-1.5 flex-1 min-w-0"
                  >
                    <h3
                      className="font-semibold text-base mb-1.5"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {step.heading}
                    </h3>
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
          </div>
        </section>

        {/* ── See it in action ── */}
        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-[960px] mx-auto">
            <h2
              className="text-2xl font-bold text-center mb-3"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              See it in action
            </h2>
            <p
              className="text-sm text-center mb-10"
              style={{ color: "var(--color-text-secondary)" }}
            >
              A walkthrough of the actual DormantFile dashboard.
            </p>
            <ProductPreview />
          </div>
        </section>

        {/* ── Security ── */}
        <section
          className="py-16 sm:py-20 px-6"
          style={{
            backgroundColor: "var(--color-primary-bg)",
            borderTop: "1px solid var(--color-primary-border)",
            borderBottom: "1px solid var(--color-primary-border)",
          }}
        >
          <div className="max-w-[960px] mx-auto text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Shield size={20} style={{ color: "var(--color-primary)" }} />
            </div>
            <h2
              className="text-2xl font-bold mb-3"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Your credentials stay yours
            </h2>
            <p
              className="text-sm mb-8 max-w-lg mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              We never store your HMRC or Companies House login details.
              Here&apos;s exactly how it works.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <KeyRound
                  size={18}
                  className="mb-3"
                  style={{ color: "var(--color-primary)" }}
                />
                <h3
                  className="font-semibold text-sm mb-1.5"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Government Gateway
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Your credentials are used once at submission and immediately
                  discarded. Never stored, never logged.
                </p>
              </div>
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Shield
                  size={18}
                  className="mb-3"
                  style={{ color: "var(--color-primary)" }}
                />
                <h3
                  className="font-semibold text-sm mb-1.5"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Authentication code
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Your Companies House auth code is used in-session to sign the
                  submission. It&apos;s never persisted.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Callouts ── */}
        <section className="py-16 sm:py-20 px-6">
          <div className="max-w-[960px] mx-auto space-y-4">
            <div
              className="rounded-xl p-5 sm:p-6"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "var(--color-warning-bg)" }}
                >
                  <AlertCircle
                    size={18}
                    style={{ color: "var(--color-warning)" }}
                  />
                </div>
                <div>
                  <h3
                    className="font-semibold text-base mb-1.5"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Behind on your filings?
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    DormantFile shows all outstanding periods for your company.
                    File them one at a time, starting from the oldest, and your
                    company will be brought up to date.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl p-5 sm:p-6"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary-bg)" }}
                >
                  <FileCheck
                    size={18}
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <div>
                  <h3
                    className="font-semibold text-base mb-1.5"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Not registered for Corporation Tax?
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    No problem. Accounts and CT600 are independent filings — you
                    can file one without the other. Many dormant companies only
                    need to file annual accounts.{" "}
                    <Link
                      href="/guides/do-i-need-ct600-dormant-company"
                      className="font-medium hover:underline focus-ring rounded"
                      style={{ color: "var(--color-primary)" }}
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
        <section
          className="py-20 sm:py-24 px-6"
          style={{
            backgroundColor: "var(--color-primary-bg)",
            borderTop: "1px solid var(--color-primary-border)",
            borderBottom: "1px solid var(--color-primary-border)",
          }}
        >
          <div className="max-w-[960px] mx-auto text-center">
            <h2
              className="text-3xl sm:text-4xl font-bold leading-tight mb-5"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.025em",
              }}
            >
              Ready to get started?
            </h2>
            <p
              className="text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Set up your company in minutes. When it&apos;s time to file, both
              returns go directly to Companies House and HMRC. From &pound;19 a
              year.
            </p>
            <div className="mb-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 text-base font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: "var(--color-cta)",
                  color: "var(--color-bg-card)",
                  padding: "16px 36px",
                }}
              >
                {isFilingLive() ? "Start filing today" : "Get started"}{" "}
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { icon: Shield, text: "Official government APIs" },
                { icon: KeyRound, text: "Credentials never stored" },
                { icon: RotateCcw, text: "14-day refund guarantee" },
              ].map((item) => (
                <MicroTrust
                  key={item.text}
                  icon={item.icon}
                  text={item.text}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter variant="marketing" />
    </div>
  );
}
