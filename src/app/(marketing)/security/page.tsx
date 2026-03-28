import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Eye, Server } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "Security | DormantFile",
  description:
    "How DormantFile handles your data and HMRC credentials. Your Gateway password is used once and never stored.",
  openGraph: {
    title: "Security | DormantFile",
    description:
      "How DormantFile handles your data and HMRC credentials. Your Gateway password is used once and never stored.",
    type: "website",
    siteName: "DormantFile",
  },
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#1E293B",
  margin: "32px 0 12px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

export default function SecurityPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Security" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Security" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
        }}
      >
        How we handle your data
      </h1>
      <p style={{ ...paragraph, fontSize: "17px", marginBottom: "32px" }}>
        The number one question we get: &ldquo;Can I trust you with my HMRC login?&rdquo; Here&apos;s exactly how it works.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {[
          {
            icon: <Shield size={24} style={{ color: "#2563EB" }} />,
            title: "Credentials never stored",
            text: "Your HMRC Government Gateway user ID and password are used at the moment of submission only. They are transmitted directly to HMRC over an encrypted TLS connection and are immediately discarded from server memory once HMRC responds. They are never written to our database.",
          },
          {
            icon: <Lock size={24} style={{ color: "#2563EB" }} />,
            title: "Encryption in transit",
            text: "All data between your browser and our servers is encrypted using TLS. Your HMRC credentials travel over the same encrypted channel to HMRC's own servers. At no point is sensitive data transmitted in plain text.",
          },
          {
            icon: <Server size={24} style={{ color: "#2563EB" }} />,
            title: "Secure password storage",
            text: "Your DormantFile account password (not your HMRC password - that's never stored) is hashed using bcrypt before it's saved. We never store your password in plain text. Even if our database were compromised, your password could not be recovered.",
          },
          {
            icon: <Eye size={24} style={{ color: "#2563EB" }} />,
            title: "No tracking cookies",
            text: "We use a single essential session cookie to keep you logged in. We do not use analytics cookies, advertising cookies, or any third-party tracking. We don't sell or share your data with advertisers.",
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              padding: "1.25rem",
              border: "1px solid #E2E8F0",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              {item.icon}
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1E293B", margin: 0 }}>
                {item.title}
              </h3>
            </div>
            <p style={{ ...paragraph, margin: 0 }}>{item.text}</p>
          </div>
        ))}
      </div>

      <h2 style={heading}>What data we store</h2>
      <p style={paragraph}>We store only what&apos;s needed to run the service:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Your email address and hashed password (for your DormantFile account).</li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Your company details: name, registration number, UTR, and accounting period dates.</li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Filing records: what was submitted, when, and HMRC&apos;s response.</li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Stripe customer ID for billing (card details are held by Stripe, not us).</li>
      </ul>

      <h2 style={heading}>Third-party services</h2>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>HMRC</strong> - receives your company details and Gateway credentials during filing.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Companies House</strong> - receives your company details and authentication code during accounts filing.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Stripe</strong> - processes payments. They hold card details, not us.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Resend</strong> - delivers transactional emails (reminders, confirmations).
        </li>
      </ul>

      <p style={paragraph}>
        For the full legal detail, read our{" "}
        <Link href="/privacy" style={{ color: "#2563EB" }}>privacy policy</Link>.
      </p>

      <ContentCTA />
    </>
  );
}
