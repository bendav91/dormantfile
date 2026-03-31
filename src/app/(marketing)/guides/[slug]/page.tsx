import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuideBySlug, getGuides, getRelatedContent } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { RelatedContent } from "@/components/marketing/RelatedContent";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/lib/content/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = getGuides();
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return {};

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/guides/${slug}`;

  return {
    title: `${guide.frontmatter.title} | DormantFile`,
    description: guide.frontmatter.description,
    keywords: guide.frontmatter.keywords,
    openGraph: {
      title: guide.frontmatter.title,
      description: guide.frontmatter.description,
      type: "article",
      url,
      siteName: "DormantFile",
    },
    alternates: { canonical: url },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) notFound();

  const related = getRelatedContent("guides", guide.frontmatter.category, slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <ArticleJsonLd
        headline={guide.frontmatter.title}
        datePublished={guide.frontmatter.publishedAt}
        dateModified={guide.frontmatter.updatedAt}
        url={`${baseUrl}/guides/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Guides", url: `${baseUrl}/guides` },
          { name: guide.frontmatter.title },
        ]}
      />
      <Breadcrumbs
        items={[{ label: "Guides", href: "/guides" }, { label: guide.frontmatter.title }]}
      />
      <article>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3 text-foreground">
          {guide.frontmatter.title}
        </h1>
        <p className="text-sm mb-8 text-muted">
          By DormantFile &middot; Updated{" "}
          {new Date(guide.frontmatter.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {guide.content}
      </article>
      <RelatedContent items={related} type="guides" />
      <ContentCTA />
    </>
  );
}
