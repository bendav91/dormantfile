export function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-card)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-inset)",
        }}
      >
        {/* Traffic light dots */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#FF5F57",
              display: "block",
            }}
          />
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#FEBC2E",
              display: "block",
            }}
          />
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#28C840",
              display: "block",
            }}
          />
        </div>

        {/* URL bar */}
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "12px",
            color: "var(--color-text-muted)",
            fontFamily: "monospace",
            letterSpacing: "0.01em",
          }}
        >
          dormantfile.co.uk/dashboard
        </div>

        {/* Spacer to balance the dots */}
        <div style={{ width: "44px", flexShrink: 0 }} />
      </div>

      {/* Content area */}
      <div style={{ padding: "24px" }}>{children}</div>
    </div>
  );
}
