import { Check, X, Code2, RotateCcw, Mail, Shield } from "lucide-react";

export function TrustSection({ children }: { children?: React.ReactNode }) {
  return (
    <section
      className="py-20 px-6"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="max-w-[960px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left — founder statement */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "var(--color-bg-inset)",
                }}
              >
                <Code2 size={22} style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <p
                  className="text-base font-semibold"
                  style={{ color: "var(--color-text-primary)", margin: 0 }}
                >
                  Built by Ben
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)", margin: 0 }}>
                  Founder &amp; developer
                </p>
              </div>
            </div>

            <h2
              className="text-2xl font-bold leading-snug mb-5"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
            >
              New doesn&apos;t mean unproven.
              <br />
              It means purpose-built.
            </h2>

            <div className="space-y-4">
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-body)" }}>
                DormantFile exists because the old tools either shut down or were never built for
                this job. I&apos;m a UK software engineer, and I built it from scratch — not adapted
                from accounting software, not a side feature in a bigger product.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-body)" }}>
                Your filings go through the same official HMRC GovTalk and Companies House Software
                Filing APIs that Xero and FreeAgent use. Same infrastructure, fraction of the price,
                and nothing you don&apos;t need.
              </p>
            </div>
          </div>

          {/* Right — trust points as a clean list */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-5"
              style={{ color: "var(--color-text-muted)" }}
            >
              The details that matter
            </p>

            <div className="space-y-0" style={{ borderTop: "1px solid var(--color-border)" }}>
              {[
                {
                  icon: Shield,
                  label: "Official APIs",
                  detail:
                    "Filed via HMRC GovTalk and CH Software Filing — the same APIs the big tools use.",
                },
                {
                  icon: X,
                  label: "Credentials never stored",
                  detail:
                    "Your HMRC Gateway password is used once at submission, then immediately discarded from memory.",
                },
                {
                  icon: Check,
                  label: "Your data, transparent",
                  detail:
                    "We store your company info, email, and filing history. We never store passwords, financial data, or card details.",
                },
                {
                  icon: RotateCcw,
                  label: "14-day refund guarantee",
                  detail:
                    "Full refund within 14 days if you haven\u2019t filed. No questions, no hoops.",
                },
                {
                  icon: Mail,
                  label: "Founder-direct support",
                  detail:
                    "Email support with replies within one working day. You talk to the person who built it.",
                },
              ].map((item, i, arr) => (
                <div
                  key={item.label}
                  className="flex gap-4 py-5"
                  style={{
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid var(--color-border)"
                        : "1px solid var(--color-border)",
                  }}
                >
                  <item.icon
                    size={18}
                    style={{
                      color: "var(--color-primary)",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <div>
                    <p
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-secondary)", margin: 0 }}
                    >
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}
