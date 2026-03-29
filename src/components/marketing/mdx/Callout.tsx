export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1.25rem",
        backgroundColor: "var(--color-primary-bg)",
        borderRadius: "0.5rem",
        border: "1px solid var(--color-primary-border)",
      }}
    >
      <div style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--color-text-body)" }}>
        {children}
      </div>
    </div>
  );
}
