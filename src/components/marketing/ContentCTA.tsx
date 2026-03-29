import Link from "next/link";

export function ContentCTA() {
  return (
    <div
      style={{
        marginTop: "3rem",
        padding: "2rem",
        backgroundColor: "var(--color-bg-page)",
        borderRadius: "0.75rem",
        textAlign: "center",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3
        className="text-xl font-semibold mb-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        Ready to file your dormant company returns?
      </h3>
      <p
        className="mb-6"
        style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}
      >
        Set up in minutes. File in seconds. Done for the year.
      </p>
      <Link
        href="/register"
        className="inline-block font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90"
        style={{
          backgroundColor: "var(--color-cta)",
          color: "#ffffff",
          padding: "12px 28px",
          borderRadius: "8px",
          textDecoration: "none",
          fontSize: "0.9375rem",
        }}
      >
        Get started &rarr;
      </Link>
    </div>
  );
}
