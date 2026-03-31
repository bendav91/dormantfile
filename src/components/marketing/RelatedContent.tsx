import Link from "next/link";
import type { ContentItem } from "@/lib/content/types";

interface RelatedContentProps {
  items: ContentItem[];
  type: "guides" | "answers";
}

export function RelatedContent({ items, type }: RelatedContentProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-lg font-semibold mb-3 text-foreground">
        Related articles
      </h3>
      <ul className="list-none p-0 m-0 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/${type}/${item.slug}`}
              className="text-primary no-underline text-[0.9375rem]"
            >
              {item.frontmatter.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
