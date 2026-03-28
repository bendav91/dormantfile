import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "Cookie Policy | DormantFile",
  description:
    "How DormantFile uses cookies. We use one essential session cookie and an optional analytics cookie with your consent.",
};

const sectionHeading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#1E293B",
  margin: "40px 0 12px 0",
  letterSpacing: "-0.01em",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#475569",
  margin: "0 0 16px 0",
};

const listItem: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#475569",
  marginBottom: "8px",
};

export default function CookiePolicyPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Cookie Policy" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Cookie Policy" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 8px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Cookie Policy
      </h1>
      <p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 40px 0" }}>
        Last updated: 28 March 2026
      </p>

      <p style={paragraph}>
        DormantFile uses a minimal number of cookies. This page explains what
        each cookie does, why we use it, and how you can control your
        preferences.
      </p>

      <h2 style={sectionHeading}>Essential cookies</h2>
      <p style={paragraph}>
        These cookies are required for the site to function and cannot be
        switched off.
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Session cookie</strong> — keeps
          you logged in while you use DormantFile. This cookie is deleted when
          you sign out or close your browser.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>Cookie consent preference</strong>{" "}
          — remembers whether you have accepted or declined optional cookies so
          we don&apos;t ask you again. Stored in your browser&apos;s local
          storage.
        </li>
      </ul>

      <h2 style={sectionHeading}>Analytics cookies (optional)</h2>
      <p style={paragraph}>
        We use Google Analytics to understand how people use DormantFile so we
        can improve the service. These cookies are{" "}
        <strong style={{ color: "#1E293B" }}>only set if you click
        &ldquo;Accept&rdquo;</strong>{" "}
        on our cookie consent banner. If you decline, no analytics cookies are
        placed and no data is sent to Google.
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>_ga</strong> — distinguishes
          unique visitors. Expires after 2 years.
        </li>
        <li style={listItem}>
          <strong style={{ color: "#1E293B" }}>_ga_*</strong> — maintains
          session state. Expires after 2 years.
        </li>
      </ul>
      <p style={paragraph}>
        Google Analytics data is used in aggregate to see which pages are
        visited and how the service is used. We do not use it to identify
        individual users.
      </p>

      <h2 style={sectionHeading}>Advertising cookies</h2>
      <p style={paragraph}>
        We do not use any advertising or third-party tracking cookies. We do not
        sell or share your data with advertisers.
      </p>

      <h2 style={sectionHeading}>Managing your preferences</h2>
      <p style={paragraph}>
        You can change your cookie preference at any time by clearing your
        browser&apos;s local storage for this site — the consent banner will
        reappear on your next visit. You can also block or delete cookies
        through your browser settings.
      </p>

      <p style={paragraph}>
        For more information about how we handle your data, see our{" "}
        <Link href="/privacy" style={{ color: "#2563EB" }}>
          privacy policy
        </Link>
        .
      </p>
    </>
  );
}
