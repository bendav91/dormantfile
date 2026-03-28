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

export interface BreadcrumbDef {
  label: string;
  href?: string;
}

export interface FAQItemDef {
  question: string;
  answer: string;
}

export interface FAQCategoryDef {
  name: string;
  items: FAQItemDef[];
}

export interface PageFrontmatter {
  title: string;
  metaTitle?: string;       // full title override — use when title alone would double up (e.g. "About DormantFile | DormantFile")
  subtitle?: string;        // plain-text subtitle rendered below h1 (pricing, how-it-works, security)
  description: string;
  updatedAt: string;
  breadcrumbs: BreadcrumbDef[];
  showCTA?: boolean;
  showUpdatedAt?: boolean;   // render "Last updated" line (privacy, terms, cookies)
  centeredHeading?: boolean; // center h1 + subtitle (pricing)
  faqCategories?: FAQCategoryDef[];
  openGraph?: {
    title?: string;
    description?: string;
    type?: string;
  };
}

export interface PageItem {
  slug: string;
  frontmatter: PageFrontmatter;
}
