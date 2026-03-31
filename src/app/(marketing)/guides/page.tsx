import type { Metadata } from "next";
import Link from "next/link";
import { getGuides } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import type { ContentCategory } from "@/lib/content/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Dormant Company Filing Guides",
  description:
    "Step-by-step guides for dormant company directors: how to file accounts, nil CT600 returns, deadlines, penalties, and costs.",
  alternates: { canonical: `${BASE_URL}/guides` },
  openGraph: {
    title: "Dormant Company Filing Guides | DormantFile",
    description:
      "Step-by-step guides for dormant company directors: filing, deadlines, penalties, and costs.",
    type: "website",
    siteName: "DormantFile",
  },
};

const categoryLabels: Record<ContentCategory, string> = {
  filing: "Filing",
  deadlines: "Deadlines & Penalties",
  "getting-started": "Getting Started",
  costs: "Costs",
  eligibility: "Eligibility",
  alternatives: "Alternatives",
  admin: "Company Admin",
};

const categoryOrder: ContentCategory[] = [
  "filing",
  "getting-started",
  "deadlines",
  "costs",
  "eligibility",
  "alternatives",
  "admin",
];

export default function GuidesIndexPage() {
  const guides = getGuides();

  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      items: guides.filter((g) => g.frontmatter.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Breadcrumbs items={[{ label: "Guides" }]} />
      <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3 text-foreground">
        Guides
      </h1>
      <p className="text-base mb-10 text-secondary">
        Step-by-step guides covering dormant company accounts, nil CT600 returns, filing deadlines,
        penalties, and costs.
      </p>

      {grouped.map((group) => (
        <section key={group.category} className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            {group.label}
          </h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-4">
            {group.items.map((item) => (
              <li
                key={item.slug}
                className="p-4 border border-border rounded-lg bg-card"
              >
                <Link
                  href={`/guides/${item.slug}`}
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
        </section>
      ))}

      <ContentCTA />
    </>
  );
}
