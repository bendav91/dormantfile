import type { Metadata } from "next";
import Link from "next/link";
import { getAnswers } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Dormant Company Filing Answers",
  description:
    "Plain-English answers to common dormant company questions: CT600, UTR numbers, authentication codes, deadlines, and more.",
  alternates: { canonical: `${BASE_URL}/answers` },
  openGraph: {
    title: "Dormant Company Filing Answers | DormantFile",
    description: "Plain-English answers to common dormant company filing questions.",
    type: "website",
    siteName: "DormantFile",
  },
};

export default function AnswersIndexPage() {
  const answers = getAnswers();

  return (
    <>
      <Breadcrumbs items={[{ label: "Answers" }]} />
      <h1
        className="text-3xl sm:text-4xl font-bold leading-tight mb-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        Quick Answers
      </h1>
      <p className="text-base mb-10" style={{ color: "var(--color-text-secondary)" }}>
        Plain-English explanations of the terms and concepts you&apos;ll encounter when filing for a
        dormant UK company.
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {answers.map((item) => (
          <li
            key={item.slug}
            style={{
              padding: "1rem",
              border: "1px solid var(--color-border)",
              borderRadius: "0.5rem",
              backgroundColor: "var(--color-bg-card)",
            }}
          >
            <Link
              href={`/answers/${item.slug}`}
              style={{
                textDecoration: "none",
                color: "var(--color-primary)",
                fontWeight: 500,
                fontSize: "0.9375rem",
              }}
            >
              {item.frontmatter.title}
            </Link>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              {item.frontmatter.description}
            </p>
          </li>
        ))}
      </ul>

      <ContentCTA />
    </>
  );
}
