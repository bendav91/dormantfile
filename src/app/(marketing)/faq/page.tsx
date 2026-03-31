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
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/${SLUG}`;
  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: url },
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

  const { title, showCTA, breadcrumbs, updatedAt, faqCategories = [] } = page.frontmatter;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Flatten categories into a flat array for JSON-LD structured data
  const faqJsonLdItems = faqCategories.flatMap((cat) =>
    cat.items.map((item) => ({ question: item.question, answer: item.answer })),
  );

  return (
    <>
      <FAQPageJsonLd items={faqJsonLdItems} />
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
        <h1 className="text-[36px] font-bold text-foreground mb-3 tracking-[-0.02em]">
          {title}
        </h1>
        {updatedAt && (
          <p className="text-sm mb-8 text-muted">
            Last reviewed{" "}
            {new Date(updatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        {page.content}
        <FAQAccordion categories={faqCategories} />
      </article>
      {showCTA && <ContentCTA />}
    </>
  );
}
