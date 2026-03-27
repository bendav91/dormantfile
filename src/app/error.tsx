"use client";

import { IBM_Plex_Sans } from "next/font/google";
import { AlertTriangle } from "lucide-react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <AlertTriangle size={48} color="#F97316" strokeWidth={1.5} />
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "24px 0 0 0",
          letterSpacing: "-0.02em",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "#64748B",
          margin: "8px 0 0 0",
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        An unexpected error occurred. Please try again or return to the home page.
      </p>
      <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
        <button
          onClick={reset}
          style={{
            backgroundColor: "#2563EB",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "all 200ms",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            backgroundColor: "transparent",
            color: "#2563EB",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "2px solid #2563EB",
            textDecoration: "none",
            transition: "all 200ms",
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
