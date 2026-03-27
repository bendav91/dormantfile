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
            <span style={{ color: "#2563EB" }}>CT600</span> in one click
          </h1>
          <p
            className="text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ color: "#475569" }}
          >
            Your company is dormant — but HMRC still requires a tax return.
            DormantFile handles the whole process in under two minutes, so you
            can get on with your life.
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
            HMRC&apos;s free filing service has closed. We make it simple again.
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
                  Direct HMRC submission
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
                  Filed directly via HMRC&apos;s official API.
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
                Enter your company name, UTR, and accounting period.
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
                Email reminders as your filing deadline approaches.
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
                File in one click
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Enter your Gateway credentials and we submit directly to HMRC.
              </p>
            </div>
          </div>
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
            Every year HMRC requires a Corporation Tax return, even if there
            is nothing to report. Until now, the free HMRC tool handled this.
            With that service closed, directors are left hunting for accounting
            software designed for businesses with actual accounts — paying for
            far more than they need. DormantFile does one thing, and does it
            well.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-md mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-10"
            style={{ color: "#1E293B" }}
          >
            Simple, transparent pricing
          </h2>
          <div
            className="rounded-xl p-8"
            style={{
              border: "2px solid #2563EB",
              backgroundColor: "#ffffff",
            }}
          >
            <div className="text-center mb-8">
              <p className="text-5xl font-bold mb-1" style={{ color: "#1E293B" }}>
                £19
              </p>
              <p className="text-sm" style={{ color: "#64748B" }}>
                per company, per year
              </p>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Nil CT600 filing for one dormant company",
                "Direct submission to HMRC",
                "Email deadline reminders",
                "Filing confirmation receipt",
                "Credentials never stored",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle
                    size={18}
                    style={{ color: "#2563EB", flexShrink: 0, marginTop: 1 }}
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
                backgroundColor: "#F97316",
                color: "#ffffff",
                padding: "14px 24px",
                borderRadius: "8px",
              }}
            >
              Get started
            </Link>
            <p
              className="text-xs text-center mt-4"
              style={{ color: "#94A3B8" }}
            >
              Compare to £100+ for most accounting software
            </p>
          </div>
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
                q: "What is a nil CT600?",
                a: "A nil CT600 is a Corporation Tax return filed for a company that had no income or expenditure during the accounting period — it confirms to HMRC that the company was dormant. You are still required to file one even if there is nothing to report.",
              },
              {
                q: "Can I use this if my company is trading?",
                a: "No. DormantFile is designed exclusively for genuinely dormant companies with no income, expenditure, or assets. If your company has been trading, you will need a full accountant.",
              },
              {
                q: "What happens after I file?",
                a: "You will receive an acknowledgement from HMRC, which we display in your dashboard and send to you by email. Your filing record is stored so you have a history of past submissions.",
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
            Ready to stop worrying about your CT600?
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
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p style={{ color: "#94A3B8" }}>
            DormantFile is not an accountancy firm. We provide a software tool
            only.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="transition-colors duration-200"
              style={{ color: "#64748B" }}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors duration-200"
              style={{ color: "#64748B" }}
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
