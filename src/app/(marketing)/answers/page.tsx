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
      <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3 text-foreground">
        Quick Answers
      </h1>
      <p className="text-base mb-10 text-secondary">
        Plain-English explanations of the terms and concepts you&apos;ll encounter when filing for a
        dormant UK company.
      </p>

      <ul className="list-none p-0 m-0 flex flex-col gap-4">
        {answers.map((item) => (
          <li
            key={item.slug}
            className="p-4 border border-border rounded-lg bg-card"
          >
            <Link
              href={`/answers/${item.slug}`}
              className="no-underline text-primary font-medium text-[0.9375rem]"
            >
              {item.frontmatter.title}
            </Link>
            <p className="text-sm mt-1 m-0 text-secondary">
              {item.frontmatter.description}
            </p>
          </li>
        ))}
      </ul>

      <ContentCTA />
    </>
  );
}
