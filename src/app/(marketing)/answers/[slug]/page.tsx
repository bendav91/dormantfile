import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnswerBySlug, getAnswers } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/lib/content/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const answers = getAnswers();
  return answers.map((answer) => ({ slug: answer.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const answer = await getAnswerBySlug(slug);
  if (!answer) return {};

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/answers/${slug}`;

  return {
    title: `${answer.frontmatter.title} | DormantFile`,
    description: answer.frontmatter.description,
    keywords: answer.frontmatter.keywords,
    openGraph: {
      title: answer.frontmatter.title,
      description: answer.frontmatter.description,
      type: "article",
      url,
      siteName: "DormantFile",
    },
    alternates: { canonical: url },
  };
}

export default async function AnswerPage({ params }: Props) {
  const { slug } = await params;
  const answer = await getAnswerBySlug(slug);
  if (!answer) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <ArticleJsonLd
        headline={answer.frontmatter.title}
        datePublished={answer.frontmatter.publishedAt}
        dateModified={answer.frontmatter.updatedAt}
        url={`${baseUrl}/answers/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Answers", url: `${baseUrl}/answers` },
          { name: answer.frontmatter.title },
        ]}
      />
      <Breadcrumbs
        items={[{ label: "Answers", href: "/answers" }, { label: answer.frontmatter.title }]}
      />
      <article>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3 text-foreground">
          {answer.frontmatter.title}
        </h1>
        <p className="text-sm mb-8 text-muted">
          By DormantFile &middot; Updated{" "}
          {new Date(answer.frontmatter.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {answer.content}
      </article>
      <ContentCTA />
    </>
  );
}
