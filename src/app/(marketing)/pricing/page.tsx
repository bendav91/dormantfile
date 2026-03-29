import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { PricingCards } from "@/components/marketing/mdx/PricingCards";
import { ComparisonTable } from "@/components/marketing/mdx/ComparisonTable";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

const SLUG = "pricing";

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

export default async function PricingPage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const {
    title,
    subtitle,
    showCTA,
    centeredHeading,
    breadcrumbs,
    plans = [],
    comparisonRows = [],
  } = page.frontmatter;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const align = centeredHeading ? ("center" as const) : undefined;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          ...breadcrumbs.map((b) => ({
            name: b.label,
            ...(b.href ? { url: `${baseUrl}${b.href}` } : {}),
          })),
        ]}
      />
      <Breadcrumbs items={breadcrumbs} />
      <article>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
            textAlign: align,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.7,
              color: "var(--color-text-body)",
              marginBottom: "32px",
              textAlign: align,
            }}
          >
            {subtitle}
          </p>
        )}
        <PricingCards plans={plans} />
        <ComparisonTable rows={comparisonRows} />
        {page.content}
      </article>
      {showCTA && <ContentCTA />}
    </>
  );
}
