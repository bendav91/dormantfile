import Link from "next/link";
import { PricingCards } from "@/components/marketing/mdx/PricingCards";
import { ComparisonTable } from "@/components/marketing/mdx/ComparisonTable";
import { Steps, Step } from "@/components/marketing/mdx/Steps";
import { SecurityCards } from "@/components/marketing/mdx/SecurityCards";
import { Callout } from "@/components/marketing/mdx/Callout";
import { EmailLink } from "@/components/marketing/mdx/EmailLink";
import { ContactForm } from "@/components/marketing/ContactForm";
import { ContentCTA } from "@/components/marketing/ContentCTA";

export const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#1E293B", marginTop: "2rem", marginBottom: "1rem", lineHeight: 1.2 }} {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1E293B", marginTop: "2rem", marginBottom: "0.75rem", lineHeight: 1.3 }} {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1E293B", marginTop: "1.5rem", marginBottom: "0.5rem", lineHeight: 1.4 }} {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "#475569", marginBottom: "1rem" }} {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", listStyleType: "disc" }} {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol style={{ paddingLeft: "1.5rem", marginBottom: "1rem", listStyleType: "decimal" }} {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li style={{ fontSize: "1rem", lineHeight: 1.7, color: "#475569", marginBottom: "0.25rem" }} {...props} />
  ),
  a: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith("/")) {
      return <Link href={href} style={{ color: "#2563EB", textDecoration: "underline" }} {...props} />;
    }
    return <a href={href} style={{ color: "#2563EB", textDecoration: "underline" }} target="_blank" rel="noopener noreferrer" {...props} />;
  },
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong style={{ fontWeight: 600, color: "#1E293B" }} {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote style={{ borderLeft: "3px solid #2563EB", paddingLeft: "1rem", margin: "1.5rem 0", fontStyle: "italic", color: "#64748B" }} {...props} />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }} {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th style={{ textAlign: "left", padding: "0.75rem", borderBottom: "2px solid #E2E8F0", fontWeight: 600, color: "#1E293B" }} {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#475569" }} {...props} />
  ),
  PricingCards,
  ComparisonTable,
  Steps,
  Step,
  SecurityCards,
  Callout,
  EmailLink,
  ContactForm,
  ContentCTA,
};
