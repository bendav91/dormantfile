import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { ReviewCTA } from "@/components/marketing/ReviewCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";
import { cn } from "@/lib/cn";

const SLUG = "about";

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

export default async function AboutPage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const { title, subtitle, showCTA, showUpdatedAt, updatedAt, centeredHeading, breadcrumbs } =
    page.frontmatter;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
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
          className={cn(
            "text-[36px] font-bold text-foreground mb-6 tracking-[-0.02em]",
            centeredHeading && "text-center",
          )}
        >
          {title}
        </h1>
        {showUpdatedAt && updatedAt && (
          <p className="text-sm text-muted mb-10">
            Last updated:{" "}
            {new Date(updatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        {subtitle && (
          <p
            className={cn(
              "text-[17px] leading-[1.7] text-body mb-8",
              centeredHeading && "text-center",
            )}
          >
            {subtitle}
          </p>
        )}
        {page.content}
      </article>
      {showCTA && <ContentCTA />}
      <div className="mt-12 max-w-md mx-auto">
        <ReviewCTA />
      </div>
    </>
  );
}
