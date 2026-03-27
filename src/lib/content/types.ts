export type ContentCategory =
  | "filing"
  | "deadlines"
  | "getting-started"
  | "costs"
  | "eligibility"
  | "alternatives"
  | "admin";

export interface ContentFrontmatter {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  category: ContentCategory;
  keywords: string[];
}

export interface ContentItem {
  slug: string;
  frontmatter: ContentFrontmatter;
}
