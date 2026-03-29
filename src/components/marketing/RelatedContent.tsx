import Link from "next/link";
import type { ContentItem } from "@/lib/content/types";

interface RelatedContentProps {
  items: ContentItem[];
  type: "guides" | "answers";
}

export function RelatedContent({ items, type }: RelatedContentProps) {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        marginTop: "2rem",
        paddingTop: "2rem",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <h3
        className="text-lg font-semibold mb-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        Related articles
      </h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/${type}/${item.slug}`}
              style={{
                color: "var(--color-primary)",
                textDecoration: "none",
                fontSize: "0.9375rem",
              }}
            >
              {item.frontmatter.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
