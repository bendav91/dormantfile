/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FiledDocumentViewer from "@/components/filed-document-viewer";

describe("FiledDocumentViewer", () => {
  it("renders an iframe with the src and a sandbox without allow-scripts", () => {
    render(<FiledDocumentViewer src="/api/file/preview-accounts?filingId=1"
      downloadHref="/api/file/preview-accounts?filingId=1&download=1"
      context="pre-filing" title="Dormant accounts" />);
    const frame = screen.getByTitle("Dormant accounts") as HTMLIFrameElement;
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("src", "/api/file/preview-accounts?filingId=1");
    expect(frame.getAttribute("sandbox")).toBe("");
  });

  it("shows the pre-filing label", () => {
    render(<FiledDocumentViewer src="/x" downloadHref="/x?download=1"
      context="pre-filing" title="t" />);
    expect(screen.getByText(/exactly what will be submitted/i)).toBeInTheDocument();
  });

  it("shows the interim label for post-accounts-interim", () => {
    render(<FiledDocumentViewer src="/x" downloadHref="/x?download=1"
      context="post-accounts-interim" title="t" />);
    expect(screen.getByText(/official copy from companies house/i)).toBeInTheDocument();
  });

  it("renders a download link", () => {
    render(<FiledDocumentViewer src="/x" downloadHref="/x?download=1"
      context="post-ct600" title="t" />);
    expect(screen.getByRole("link", { name: /download/i }))
      .toHaveAttribute("href", "/x?download=1");
  });
});
