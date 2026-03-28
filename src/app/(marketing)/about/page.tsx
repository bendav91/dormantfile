import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "About DormantFile",
  description:
    "Why DormantFile was built, who's behind it, and our mission to make dormant company filing affordable and painless.",
  openGraph: {
    title: "About DormantFile",
    description:
      "Why DormantFile was built, who's behind it, and our mission to make dormant company filing affordable and painless.",
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

export default function AboutPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "About" },
        ]}
      />
      <Breadcrumbs items={[{ label: "About" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 24px 0",
          letterSpacing: "-0.02em",
        }}
      >
        About DormantFile
      </h1>

      <p style={paragraph}>
        I built DormantFile because I needed it myself.
      </p>
      <p style={paragraph}>
        I run several dormant limited companies in the UK - holding structures, side projects that never launched, companies kept open for future plans. Every year, each one needs the same two filings: annual accounts to Companies House and a nil CT600 to HMRC. The companies do nothing, but the paperwork never stops.
      </p>
      <p style={paragraph}>
        For years, the free HMRC tool (CATO) handled the tax return side. It wasn&apos;t pretty, but it worked and it cost nothing. When HMRC announced CATO was closing on 31 March 2026, I looked at the alternatives: hire an accountant at £80-£150 per company per year for a zero-activity filing, or buy general-purpose accounting software that&apos;s overkill for a company with no transactions.
      </p>
      <p style={paragraph}>
        Neither option made sense. So I built DormantFile.
      </p>

      <h2 style={heading}>What DormantFile does</h2>
      <p style={paragraph}>
        DormantFile files two things for dormant UK limited companies:
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Annual accounts</strong> - submitted directly to Companies House via their official software filing API.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Nil CT600 Corporation Tax return</strong> - submitted directly to HMRC via their GovTalk API.
        </li>
      </ul>
      <p style={paragraph}>
        Both filings confirm that your company was dormant during the accounting period. No transactions, no tax liability. DormantFile handles the XML, the submission, and the confirmation - you just click a button.
      </p>

      <h2 style={heading}>Who&apos;s behind it</h2>
      <p style={paragraph}>
        DormantFile is built and run by a solo founder based in the UK. I&apos;m a software engineer, not an accountant. DormantFile is a software tool - it prepares and submits your filings, but it does not provide accounting or tax advice. If your company has traded or you&apos;re unsure whether it qualifies as dormant, you should speak to a qualified accountant.
      </p>

      <h2 style={heading}>Our approach</h2>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Affordable</strong> - from £19/year, because filing a nil return shouldn&apos;t cost more than the company earns (which is nothing).
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Secure</strong> - your HMRC credentials are used once and never stored. Read our{" "}
          <Link href="/security" style={{ color: "#2563EB" }}>security page</Link> for the full details.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Simple</strong> - no features you don&apos;t need. No invoicing, no payroll, no VAT. Just the two filings a dormant company actually requires.
        </li>
      </ul>

      <ContentCTA />
    </>
  );
}
