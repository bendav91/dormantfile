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
      <h1
        className="text-3xl sm:text-4xl font-bold leading-tight mb-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        Guides
      </h1>
      <p className="text-base mb-10" style={{ color: "var(--color-text-secondary)" }}>
        Step-by-step guides covering dormant company accounts, nil CT600 returns, filing deadlines,
        penalties, and costs.
      </p>

      {grouped.map((group) => (
        <section key={group.category} style={{ marginBottom: "2.5rem" }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
            {group.label}
          </h2>
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
            {group.items.map((item) => (
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
                  href={`/guides/${item.slug}`}
                  style={{
                    textDecoration: "none",
                    color: "var(--color-primary)",
                    fontWeight: 500,
                    fontSize: "0.9375rem",
                  }}
                >
                  {item.frontmatter.title}
                </Link>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--color-text-secondary)", margin: 0 }}
                >
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
