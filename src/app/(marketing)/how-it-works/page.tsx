import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd, HowToJsonLd } from "@/lib/content/json-ld";

const SLUG = "how-it-works";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug(SLUG);
  if (!page) return {};
  const { title, metaTitle, description, openGraph } = page.frontmatter;
  const resolvedTitle = metaTitle || `${title} | DormantFile`;
  return {
    title: resolvedTitle,
    description,
    openGraph: {
      title: openGraph?.title || resolvedTitle,
      description: openGraph?.description || description,
      type: (openGraph?.type as "website" | "article") || "website",
      siteName: "DormantFile",
    },
  };
}

const howToSteps = [
  { name: "Create your account", text: "Sign up with your email address and set a password." },
  { name: "Add your company", text: "Enter your company registration number. We look up the company name from Companies House. Add your UTR and accounting period dates." },
  { name: "Choose your plan", text: "Pick Basic for one company, Multiple for up to 10, or Agent for up to 100." },
  { name: "Get deadline reminders", text: "We calculate your filing deadlines and send email reminders at 90, 30, 14, 7, 3, and 1 day before they are due." },
  { name: "File your accounts", text: "Submit dormant accounts to Companies House. Enter your authentication code and we handle the rest." },
  { name: "File your CT600", text: "Submit a nil CT600 to HMRC. Enter your Government Gateway credentials — used once and never stored." },
  { name: "Get confirmation", text: "Once accepted, we show confirmation in your dashboard and send you an email." },
];

export default async function HowItWorksPage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const { title, subtitle, showCTA, showUpdatedAt, updatedAt, centeredHeading, breadcrumbs } = page.frontmatter;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const align = centeredHeading ? "center" as const : undefined;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          ...breadcrumbs.map((b) => ({ name: b.label, ...(b.href ? { url: `${baseUrl}${b.href}` } : {}) })),
        ]}
      />
      <HowToJsonLd
        name="How to file dormant company accounts and nil CT600 returns"
        description="Step-by-step guide to filing for a dormant UK limited company using DormantFile."
        steps={howToSteps}
      />
      <Breadcrumbs items={breadcrumbs} />
      <article>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "#1E293B",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
            textAlign: align,
          }}
        >
          {title}
        </h1>
        {showUpdatedAt && updatedAt && (
          <p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 40px 0" }}>
            Last updated: {new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        {subtitle && (
          <p style={{ fontSize: "17px", lineHeight: 1.7, color: "#475569", marginBottom: "32px", textAlign: align }}>
            {subtitle}
          </p>
        )}
        {page.content}
      </article>
      {showCTA && <ContentCTA />}
    </>
  );
}
