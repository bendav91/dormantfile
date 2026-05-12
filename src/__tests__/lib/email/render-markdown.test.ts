import { describe, it, expect } from "vitest";
import { renderMarkdownForEmail } from "@/lib/email/render-markdown";

describe("renderMarkdownForEmail", () => {
  it("renders bold and italic", () => {
    const html = renderMarkdownForEmail("This is **bold** and *italic*.");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("renders links", () => {
    const html = renderMarkdownForEmail("[Click](https://example.com)");
    expect(html).toContain('<a href="https://example.com">Click</a>');
  });

  it("renders headings", () => {
    const html = renderMarkdownForEmail("## Section");
    expect(html).toContain("<h2");
    expect(html).toContain("Section");
  });

  it("renders unordered lists", () => {
    const html = renderMarkdownForEmail("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });

  it("converts single line breaks to <br> (breaks: true)", () => {
    const html = renderMarkdownForEmail("first line\nsecond line");
    expect(html).toContain("<br>");
  });
});
