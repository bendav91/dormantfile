import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/marketing/MDXComponents";
import type { ContentFrontmatter, ContentItem } from "./types";

const DEFAULT_CONTENT_DIR = path.join(process.cwd(), "content");

export function getContentItems(
  type: "guides" | "answers",
  contentDir = DEFAULT_CONTENT_DIR,
): ContentItem[] {
  const dir = path.join(contentDir, type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

  return files
    .map((filename) => {
      const slug = filename.replace(".mdx", "");
      const filePath = path.join(dir, filename);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContent);

      return {
        slug,
        frontmatter: data as ContentFrontmatter,
      };
    })
    .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));
}

export async function getContentBySlug(
  type: "guides" | "answers",
  slug: string,
  contentDir = DEFAULT_CONTENT_DIR,
) {
  const filePath = path.join(contentDir, type, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");

  const { content, frontmatter } = await compileMDX<ContentFrontmatter>({
    source: fileContent,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  return { content, frontmatter, slug };
}

export function getGuides() {
  return getContentItems("guides");
}

export function getAnswers() {
  return getContentItems("answers");
}

export async function getGuideBySlug(slug: string) {
  return getContentBySlug("guides", slug);
}

export async function getAnswerBySlug(slug: string) {
  return getContentBySlug("answers", slug);
}

export function getRelatedContent(
  type: "guides" | "answers",
  category: string,
  currentSlug: string,
  limit = 3,
  contentDir = DEFAULT_CONTENT_DIR,
): ContentItem[] {
  const items = getContentItems(type, contentDir);
  return items
    .filter(
      (item) =>
        item.frontmatter.category === category && item.slug !== currentSlug,
    )
    .slice(0, limit);
}
