import Link from "next/link";

export function ContentCTA() {
  return (
    <div
      style={{
        marginTop: "3rem",
        padding: "2rem",
        backgroundColor: "#F8FAFC",
        borderRadius: "0.75rem",
        textAlign: "center",
        border: "1px solid #E2E8F0",
      }}
    >
      <h3
        className="text-xl font-semibold mb-2"
        style={{ color: "#1E293B" }}
      >
        Ready to file your dormant company returns?
      </h3>
      <p
        className="mb-6"
        style={{ color: "#64748B", fontSize: "0.9375rem" }}
      >
        Set up in minutes. File in seconds. Done for the year.
      </p>
      <Link
        href="/register"
        className="inline-block font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90"
        style={{
          backgroundColor: "#F97316",
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
