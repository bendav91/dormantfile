import type { MetadataRoute } from "next";
import { getGuides, getAnswers } from "@/lib/content/mdx";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  const guides = getGuides();
  const answers = getAnswers();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/security",
    "/how-it-works",
    "/pricing",
    "/faq",
    "/contact",
    "/privacy",
    "/cookies",
    "/terms",
    "/acceptable-use",
    "/refund",
    "/guides",
    "/answers",
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const guideRoutes: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${BASE_URL}/guides/${guide.slug}`,
    lastModified: new Date(guide.frontmatter.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const answerRoutes: MetadataRoute.Sitemap = answers.map((answer) => ({
    url: `${BASE_URL}/answers/${answer.slug}`,
    lastModified: new Date(answer.frontmatter.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...guideRoutes, ...answerRoutes];
}
