import { describe, it, expect } from "vitest";
import path from "path";
import { getContentItems, getRelatedContent } from "@/lib/content/mdx";

const fixtureDir = path.join(process.cwd(), "src/__tests__/fixtures/content");

describe("getContentItems", () => {
  it("returns all guides with correct slugs and frontmatter", () => {
    const items = getContentItems("guides", fixtureDir);
    expect(items).toHaveLength(2);
    expect(items[0].slug).toBe("test-guide-b");
    expect(items[0].frontmatter.title).toBe("Another Test Guide");
    expect(items[0].frontmatter.category).toBe("deadlines");
    expect(items[1].slug).toBe("test-guide-a");
    expect(items[1].frontmatter.title).toBe("Test Guide A");
    expect(items[1].frontmatter.category).toBe("filing");
  });

  it("returns all answers", () => {
    const items = getContentItems("answers", fixtureDir);
    expect(items).toHaveLength(1);
    expect(items[0].slug).toBe("test-answer-a");
    expect(items[0].frontmatter.title).toBe("Test Answer A");
  });

  it("returns empty array for non-existent directory", () => {
    const items = getContentItems("guides", "/nonexistent/path");
    expect(items).toEqual([]);
  });

  it("derives slug from filename", () => {
    const items = getContentItems("guides", fixtureDir);
    items.forEach((item) => {
      expect(item.slug).not.toContain(".mdx");
      expect(item.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });
});

describe("getRelatedContent", () => {
  it("returns items in the same category, excluding current slug", () => {
    const related = getRelatedContent("guides", "filing", "some-other-slug", 3, fixtureDir);
    expect(related).toHaveLength(1);
    expect(related[0].slug).toBe("test-guide-a");
  });

  it("excludes the current slug from results", () => {
    const related = getRelatedContent("guides", "filing", "test-guide-a", 3, fixtureDir);
    expect(related).toHaveLength(0);
  });

  it("respects the limit parameter", () => {
    const related = getRelatedContent("guides", "filing", "other", 0, fixtureDir);
    expect(related).toHaveLength(0);
  });

  it("returns empty array when no items match category", () => {
    const related = getRelatedContent("guides", "costs", "other", 3, fixtureDir);
    expect(related).toEqual([]);
  });
});
