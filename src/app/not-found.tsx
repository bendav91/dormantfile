import { IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function NotFoundPage() {
  return (
    <div
      className={ibmPlexSans.className}
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-page)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <FileQuestion size={48} style={{ color: "var(--color-bg-disabled)" }} strokeWidth={1.5} />
      <h1
        style={{
          fontSize: "72px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: "24px 0 0 0",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: "18px",
          color: "var(--color-text-secondary)",
          margin: "12px 0 0 0",
          textAlign: "center",
        }}
      >
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="focus-ring"
        style={{
          marginTop: "32px",
          backgroundColor: "var(--color-primary)",
          color: "var(--color-bg-card)",
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          textDecoration: "none",
          transition: "background-color 200ms, color 200ms",
        }}
      >
        Go home
      </Link>
    </div>
  );
}
