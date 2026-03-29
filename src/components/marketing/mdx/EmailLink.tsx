import { Mail } from "lucide-react";

export function EmailLink({ email }: { email: string }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1rem",
        backgroundColor: "var(--color-primary-bg)",
        borderRadius: "0.5rem",
        border: "1px solid var(--color-primary-border)",
        marginBottom: "2rem",
      }}
    >
      <Mail size={20} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
      <a href={`mailto:${email}`} style={{ color: "var(--color-primary)", fontWeight: 500, fontSize: "15px" }}>
        {email}
      </a>
    </span>
  );
}
