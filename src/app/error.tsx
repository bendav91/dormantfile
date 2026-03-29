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
        backgroundColor: "var(--color-bg-page)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <AlertTriangle size={48} color="var(--color-cta)" strokeWidth={1.5} />
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: "24px 0 0 0",
          letterSpacing: "-0.02em",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "var(--color-text-secondary)",
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
          className="focus-ring"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-bg-card)",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "background-color 200ms, color 200ms",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          className="focus-ring"
          style={{
            backgroundColor: "transparent",
            color: "var(--color-primary)",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "2px solid var(--color-primary)",
            textDecoration: "none",
            transition: "background-color 200ms, color 200ms",
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
