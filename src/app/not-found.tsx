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
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <FileQuestion size={48} color="#CBD5E1" strokeWidth={1.5} />
      <h1
        style={{
          fontSize: "72px",
          fontWeight: 700,
          color: "#1E293B",
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
          color: "#64748B",
          margin: "12px 0 0 0",
          textAlign: "center",
        }}
      >
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "32px",
          backgroundColor: "#2563EB",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          textDecoration: "none",
          transition: "all 200ms",
        }}
      >
        Go home
      </Link>
    </div>
  );
}
