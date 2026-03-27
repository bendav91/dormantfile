// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
  FAQPageJsonLd,
  OrganizationJsonLd,
} from "@/lib/content/json-ld";

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent || "") : null;
}

describe("ArticleJsonLd", () => {
  it("renders valid Article schema", () => {
    const { container } = render(
      <ArticleJsonLd
        headline="Test Article"
        datePublished="2026-03-27"
        dateModified="2026-03-27"
        url="https://dormantfile.co.uk/guides/test"
      />,
    );
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe("Test Article");
    expect(data.datePublished).toBe("2026-03-27");
    expect(data.author.name).toBe("DormantFile");
  });
});

describe("BreadcrumbJsonLd", () => {
  it("renders BreadcrumbList with correct positions", () => {
    const { container } = render(
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://dormantfile.co.uk" },
          { name: "Guides", url: "https://dormantfile.co.uk/guides" },
          { name: "Test Guide" },
        ]}
      />,
    );
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[2].item).toBeUndefined();
  });
});

describe("FAQPageJsonLd", () => {
  it("renders FAQPage schema with questions", () => {
    const { container } = render(
      <FAQPageJsonLd
        items={[
          { question: "Is it safe?", answer: "Yes, very safe." },
          { question: "How much?", answer: "£19/year." },
        ]}
      />,
    );
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]["@type"]).toBe("Question");
    expect(data.mainEntity[0].acceptedAnswer.text).toBe("Yes, very safe.");
  });
});

describe("OrganizationJsonLd", () => {
  it("renders Organization schema", () => {
    const { container } = render(<OrganizationJsonLd />);
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("DormantFile");
  });
});
