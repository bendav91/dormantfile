interface BrandPanelProps {
  variant: "register" | "returning";
}

const STEPS = [
  { number: 1, title: "Add your company", subtitle: "Instant lookup by company number" },
  { number: 2, title: "We file for you", subtitle: "CT600 to HMRC + accounts to Companies House" },
  { number: 3, title: "You're done", subtitle: "Confirmation from HMRC & Companies House" },
];

const TRUST_SIGNALS = [
  "Encrypted & secure",
  "Files direct to HMRC & Companies House",
  "From £19/year",
];

export function BrandPanel({ variant }: BrandPanelProps) {
  const isRegister = variant === "register";

  return (
    <div
      className="hidden md:flex flex-col justify-center px-10 lg:px-16 py-12"
      style={{
        background:
          "linear-gradient(160deg, var(--color-primary-bg), var(--color-primary-border))",
      }}
    >
      <p
        className="text-xs font-semibold tracking-[0.2em] uppercase mb-6"
        style={{ color: "var(--color-primary)" }}
      >
        DormantFile
      </p>

      <h2
        className="text-2xl lg:text-3xl font-bold mb-2 leading-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {isRegister
          ? "Three steps. Two filings. One less thing to worry about."
          : "Welcome back."}
      </h2>

      {!isRegister && (
        <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
          Your filings are waiting.
        </p>
      )}

      {isRegister && <div className="mb-8" />}

      <div className="flex flex-col gap-4 mb-8">
        {STEPS.map((step) => (
          <div key={step.number} className="flex items-start gap-3">
            <div
              className="auth-step-badge w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                color: "var(--color-primary)",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
              }}
            >
              {step.number}
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {step.title}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {step.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg p-3 flex flex-wrap gap-x-4 gap-y-1"
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderWidth: "1px",
          borderColor: "var(--color-border)",
        }}
      >
        {TRUST_SIGNALS.map((signal) => (
          <p
            key={signal}
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {signal}
          </p>
        ))}
      </div>
    </div>
  );
}

export function BrandPanelMobile() {
  return (
    <div
      className="md:hidden px-6 py-4"
      style={{
        background:
          "linear-gradient(160deg, var(--color-primary-bg), var(--color-primary-border))",
      }}
    >
      <p
        className="text-xs font-semibold tracking-[0.2em] uppercase"
        style={{ color: "var(--color-primary)" }}
      >
        DormantFile
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
        Affordable dormant company filing
      </p>
    </div>
  );
}
