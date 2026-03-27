import type { Metadata } from "next";
import Link from "next/link";
import { getAnswers } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";

export const metadata: Metadata = {
  title: "Answers | DormantFile",
  description:
    "Quick answers to common questions about dormant company filing: CT600, UTR numbers, deadlines, and more.",
  openGraph: {
    title: "Answers | DormantFile",
    description:
      "Quick answers to common questions about dormant company filing.",
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
        style={{ color: "#1E293B" }}
      >
        Quick Answers
      </h1>
      <p className="text-base mb-10" style={{ color: "#64748B" }}>
        Short explanations of the terms and concepts you&apos;ll come across
        when filing for a dormant company.
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
              border: "1px solid #E2E8F0",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
            }}
          >
            <Link
              href={`/answers/${item.slug}`}
              style={{
                textDecoration: "none",
                color: "#2563EB",
                fontWeight: 500,
                fontSize: "0.9375rem",
              }}
            >
              {item.frontmatter.title}
            </Link>
            <p
              className="text-sm mt-1"
              style={{ color: "#64748B", margin: 0 }}
            >
              {item.frontmatter.description}
            </p>
          </li>
        ))}
      </ul>

      <ContentCTA />
    </>
  );
}
