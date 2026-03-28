export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1.25rem",
        backgroundColor: "#EFF6FF",
        borderRadius: "0.5rem",
        border: "1px solid #DBEAFE",
      }}
    >
      <div style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569" }}>
        {children}
      </div>
    </div>
  );
}
