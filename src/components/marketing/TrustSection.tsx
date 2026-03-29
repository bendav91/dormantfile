import { Code2, Shield, KeyRound, MessageCircle, RotateCcw } from "lucide-react";

const trustPoints = [
  {
    icon: Shield,
    heading: "Official APIs",
    description: "Files directly via HMRC GovTalk and Companies House Software Filing APIs.",
  },
  {
    icon: KeyRound,
    heading: "Credentials never stored",
    description: "Your Gateway password is used once at submission, then immediately discarded.",
  },
  {
    icon: MessageCircle,
    heading: "Email support",
    description: "Replies within one working day.",
  },
  {
    icon: RotateCcw,
    heading: "14-day refund",
    description: "Full refund within 14 days if you haven\u2019t filed.",
  },
];

export function TrustSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[960px] mx-auto">
        <h2
          className="text-2xl font-bold text-center mb-16"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
        >
          Why trust DormantFile?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Founder card */}
          <div
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "var(--color-bg-inset)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Code2 size={24} style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "var(--color-text-primary)", margin: 0 }}
                >
                  Built by Ben
                </h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)", margin: 0 }}>
                  Founder &amp; developer
                </p>
              </div>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-body)", margin: 0 }}
            >
              Software engineer based in the UK. I built DormantFile because dormant company filing
              shouldn&apos;t require an accountant or expensive software.
            </p>
          </div>

          {/* Trust points grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {trustPoints.map((point) => (
              <div
                key={point.heading}
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                }}
              >
                <point.icon
                  size={20}
                  style={{ color: "var(--color-primary)", marginBottom: "8px" }}
                />
                <h4
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)", margin: "0 0 4px 0" }}
                >
                  {point.heading}
                </h4>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--color-text-secondary)", margin: 0 }}
                >
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
