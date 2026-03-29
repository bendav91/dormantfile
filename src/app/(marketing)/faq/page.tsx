import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { FAQAccordion } from "@/components/marketing/FAQAccordion";
import { FAQPageJsonLd, BreadcrumbJsonLd } from "@/lib/content/json-ld";

const SLUG = "faq";

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

export default async function FAQPage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const { title, showCTA, breadcrumbs, faqCategories = [] } = page.frontmatter;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Flatten categories into a flat array for JSON-LD structured data
  const faqJsonLdItems = faqCategories.flatMap((cat) =>
    cat.items.map((item) => ({ question: item.question, answer: item.answer }))
  );

  return (
    <>
      <FAQPageJsonLd items={faqJsonLdItems} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          ...breadcrumbs.map((b) => ({ name: b.label, ...(b.href ? { url: `${baseUrl}${b.href}` } : {}) })),
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
          }}
        >
          {title}
        </h1>
        {page.content}
        <FAQAccordion categories={faqCategories} />
      </article>
      {showCTA && <ContentCTA />}
    </>
  );
}
