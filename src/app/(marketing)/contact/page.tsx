import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContactForm } from "@/components/marketing/ContactForm";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "Contact | DormantFile",
  description:
    "Get in touch with DormantFile. We typically respond within one working day.",
  openGraph: {
    title: "Contact | DormantFile",
    description: "Get in touch with DormantFile.",
    type: "website",
    siteName: "DormantFile",
  },
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

export default function ContactPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Contact" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Contact us
      </h1>
      <p style={paragraph}>
        Have a question or need help? We typically respond within one working day.
      </p>

      <div
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
        <a
          href="mailto:hello@dormantfile.co.uk"
          style={{ color: "#2563EB", fontWeight: 500, fontSize: "15px" }}
        >
          hello@dormantfile.co.uk
        </a>
      </div>

      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#1E293B",
          margin: "0 0 12px 0",
        }}
      >
        Or send us a message
      </h2>
      <ContactForm />
    </>
  );
}
