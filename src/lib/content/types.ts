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

export interface PlanDef {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface ComparisonRowDef {
  method: string;
  cost: string;
  time: string;
  notes: string;
}

export interface SecurityCardDef {
  icon: string;
  title: string;
  text: string;
}

export interface PageFrontmatter {
  title: string;
  metaTitle?: string;
  subtitle?: string;
  description: string;
  updatedAt: string;
  breadcrumbs: BreadcrumbDef[];
  showCTA?: boolean;
  showUpdatedAt?: boolean;
  centeredHeading?: boolean;
  faqCategories?: FAQCategoryDef[];
  plans?: PlanDef[];
  comparisonRows?: ComparisonRowDef[];
  securityCards?: SecurityCardDef[];
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
