import { IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import {
  Shield,
  Clock,
  FileCheck,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function LandingPage() {
  return (
    <div
      className={ibmPlexSans.className}
      style={{ backgroundColor: "#F8FAFC", color: "#1E293B" }}
    >
      {/* Navigation */}
      <nav
        style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #E2E8F0" }}
        className="sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span
            className="text-xl font-semibold"
            style={{ color: "#2563EB" }}
          >
            DormantFile
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors duration-200 nav-signin-link"
              style={{ color: "#1E293B" }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: "#F97316",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "8px",
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6"
            style={{ color: "#1E293B" }}
          >
            File your dormant company{" "}
            <span style={{ color: "#2563EB" }}>accounts</span> in minutes
          </h1>
          <p
            className="text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ color: "#475569" }}
          >
            Annual accounts with Companies House, plus Corporation Tax returns
            with HMRC — all from one dashboard. No accounting knowledge required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-base font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundColor: "#F97316",
              color: "#ffffff",
              padding: "16px 32px",
              borderRadius: "8px",
            }}
          >
            Start filing <ArrowRight size={18} />
          </Link>
          <p
            className="mt-5 text-sm"
            style={{ color: "#64748B" }}
          >
            From Companies House accounts to HMRC tax returns — we handle it all.
          </p>
        </div>
      </section>

      {/* Trust Indicators */}
      <section
        style={{ backgroundColor: "#ffffff", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}
        className="py-10 px-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <Shield size={22} style={{ color: "#2563EB", flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "#1E293B" }}>
                  Credentials never stored
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                  Your Gateway password is used once and discarded.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <Clock size={22} style={{ color: "#2563EB", flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "#1E293B" }}>
                  File in under 2 minutes
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                  No accounting knowledge required.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <FileCheck size={22} style={{ color: "#2563EB", flexShrink: 0 }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "#1E293B" }}>
                  Direct submission
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                  Filed directly with Companies House and HMRC — no middlemen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-14"
            style={{ color: "#1E293B" }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 flex-shrink-0"
                style={{ backgroundColor: "#2563EB" }}
              >
                1
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "#1E293B" }}>
                Add your company
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Enter your companies house number, we locate the rest. No data entry required.
              </p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 flex-shrink-0"
                style={{ backgroundColor: "#2563EB" }}
              >
                2
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "#1E293B" }}>
                We remind you
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Email reminders as your dormant filing deadline approaches.
              </p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 flex-shrink-0"
                style={{ backgroundColor: "#2563EB" }}
              >
                3
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: "#1E293B" }}>
                File in minutes
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                File dormant accounts and nil tax returns in minutes - no hassle - every year!
              </p>
            </div>
          </div>
          <p className="text-center mt-8">
            <Link
              href="/how-it-works"
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: "#2563EB" }}
            >
              See the full walkthrough &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Problem Statement */}
      <section
        style={{ backgroundColor: "#EFF6FF", borderTop: "1px solid #DBEAFE", borderBottom: "1px solid #DBEAFE" }}
        className="py-20 px-6"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: "#1E293B" }}>
            Stuck with a company you can&apos;t close?
          </h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "#475569" }}>
            Thousands of UK directors keep dormant limited companies on the
            register — a side project that never took off, a holding structure
            no longer needed, or a company waiting on a future venture. The
            company is inactive, but the filing obligations never stop.
          </p>
          <p className="text-lg leading-relaxed" style={{ color: "#475569" }}>
            Every year, Companies House requires annual accounts and HMRC
            requires a Corporation Tax return, even if there is nothing to
            report. Until now, the free HMRC tool handled the tax side. With
            that service closed, directors are left hunting for accounting
            software designed for businesses with actual accounts — paying for
            far more than they need. DormantFile does one thing, and does it
            well.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ color: "#1E293B" }}
          >
            Simple, transparent pricing
          </h2>
          <p
            className="text-center text-base mb-12 max-w-xl mx-auto"
            style={{ color: "#64748B" }}
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
                  "Annual accounts + CT600 filing for one company",
                  "Direct submission to CH and HMRC",
                  "Email deadline reminders",
                  "Filing confirmation receipt",
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
                name: "Bulk",
                price: "49",
                period: "per year",
                description: "Up to 100 companies",
                features: [
                  "Everything in Multiple",
                  "File for up to 100 dormant companies",
                  "Ideal for company secretaries",
                  "Priority support",
                ],
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl p-7 flex flex-col"
                style={{
                  border: plan.highlighted ? "2px solid #2563EB" : "1px solid #E2E8F0",
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
                <p className="font-semibold text-sm mb-1" style={{ color: "#2563EB" }}>
                  {plan.name}
                </p>
                <div className="mb-1">
                  <span className="text-4xl font-bold" style={{ color: "#1E293B" }}>
                    £{plan.price}
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
                  }}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <p
            className="text-xs text-center mt-6"
            style={{ color: "#94A3B8" }}
          >
            Compare to £100+ for most accounting software. All plans include credentials-never-stored security.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{ backgroundColor: "#ffffff", borderTop: "1px solid #E2E8F0" }}
        className="py-20 px-6"
      >
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: "#1E293B" }}
          >
            Common questions
          </h2>
          <div className="space-y-8">
            {[
              {
                q: "Is my data secure?",
                a: "Yes. Your HMRC Gateway credentials are used only at the moment of submission and are never written to our database. All data is transmitted over TLS and stored securely.",
              },
              {
                q: "What filings does DormantFile handle?",
                a: "DormantFile handles two filings: annual accounts with Companies House (required for all companies) and a nil CT600 Corporation Tax return with HMRC (for companies registered for Corporation Tax). Both confirm that your company was dormant during the period.",
              },
              {
                q: "What if my company isn&apos;t registered for Corporation Tax?",
                a: "No problem — most dormant companies only need to file annual accounts with Companies House. You can add Corporation Tax filing later if needed.",
              },
              {
                q: "Can I use this if my company is trading?",
                a: "No. DormantFile is designed exclusively for genuinely dormant companies with no income, expenditure, or assets. If your company has been trading, you will need a full accountant.",
              },
              {
                q: "What happens after I file?",
                a: "You will receive acknowledgements from Companies House and HMRC, which we display in your dashboard and send to you by email. Your filing records are stored so you have a history of past submissions.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                style={{ borderBottom: "1px solid #E2E8F0" }}
                className="pb-8"
              >
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "#1E293B" }}
                >
                  {q}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                  {a}
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
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Ready to stop worrying about your dormant company filings?
          </h2>
          <p className="text-lg mb-10" style={{ color: "#94A3B8" }}>
            Set up in minutes. File in seconds. Done for the year.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-base font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundColor: "#F97316",
              color: "#ffffff",
              padding: "16px 32px",
              borderRadius: "8px",
            }}
          >
            Start filing today <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{ backgroundColor: "#F1F5F9", borderTop: "1px solid #E2E8F0" }}
        className="py-8 px-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            {[
              { href: "/about", label: "About" },
              { href: "/security", label: "Security" },
              { href: "/faq", label: "FAQ" },
              { href: "/contact", label: "Contact" },
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition-colors duration-200"
                style={{ color: "#64748B" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-center text-xs" style={{ color: "#94A3B8" }}>
            DormantFile is not an accountancy firm. We provide a software tool only.
          </p>
        </div>
      </footer>
    </div>
  );
}
