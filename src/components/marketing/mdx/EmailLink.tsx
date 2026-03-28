import { Mail } from "lucide-react";

export function EmailLink({ email }: { email: string }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1rem",
        backgroundColor: "#EFF6FF",
        borderRadius: "0.5rem",
        border: "1px solid #DBEAFE",
        marginBottom: "2rem",
      }}
    >
      <Mail size={20} style={{ color: "#2563EB", flexShrink: 0 }} />
      <a href={`mailto:${email}`} style={{ color: "#2563EB", fontWeight: 500, fontSize: "15px" }}>
        {email}
      </a>
    </span>
  );
}
