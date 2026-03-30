/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock theme provider
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn(), resolvedTheme: "light" }),
}));

import { SiteNav } from "@/components/SiteNav";

describe("SiteNav", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  describe("marketing variant", () => {
    it("renders marketing nav links", () => {
      render(<SiteNav variant="marketing" />);
      // Links appear in both desktop and mobile drawer
      expect(screen.getAllByText("Pricing").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Resources").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Sign in").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Get started").length).toBeGreaterThanOrEqual(1);
    });

    it("does not render app-specific items", () => {
      render(<SiteNav variant="marketing" />);
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("links logo to /", () => {
      render(<SiteNav variant="marketing" />);
      // Two logos: top bar + drawer header
      const logos = screen.getAllByRole("img", { name: "DormantFile" });
      const logoLink = logos[0].closest("a");
      expect(logoLink).toHaveAttribute("href", "/");
    });

    it("opens Resources dropdown on click", () => {
      render(<SiteNav variant="marketing" />);
      const resourcesButtons = screen.getAllByText("Resources");
      // Desktop dropdown button (first one)
      fireEvent.click(resourcesButtons[0]);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Guides" })).toBeInTheDocument();
    });
  });

  describe("app variant", () => {
    it("renders app nav links", () => {
      render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
      // Links appear in both desktop and mobile drawer
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
    });

    it("displays user email", () => {
      render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
      // Email appears in both desktop and drawer
      expect(screen.getAllByText("ben@example.com").length).toBeGreaterThanOrEqual(1);
    });

    it("does not render marketing items", () => {
      render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
      expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
      expect(screen.queryByText("Get started")).not.toBeInTheDocument();
    });

    it("links logo to /dashboard", () => {
      render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
      // Two logos: top bar + drawer header
      const logos = screen.getAllByRole("img", { name: "DormantFile" });
      const logoLink = logos[0].closest("a");
      expect(logoLink).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("mobile drawer", () => {
    it("opens drawer when hamburger is clicked", () => {
      render(<SiteNav variant="marketing" />);
      const hamburger = screen.getByLabelText("Open menu");
      fireEvent.click(hamburger);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("locks body scroll when drawer is open", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("unlocks body scroll when drawer is closed", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      // Two "Close menu" buttons: hamburger (toggled) + drawer close button
      const closeButtons = screen.getAllByLabelText("Close menu");
      fireEvent.click(closeButtons[0]);
      expect(document.body.style.overflow).toBe("");
    });

    it("closes drawer on Escape key", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(document.body.style.overflow).toBe("");
      expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal", "true");
    });

    it("expands accordion in drawer", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      // Find the accordion button in the drawer (the second "Resources" text)
      const resourcesButtons = screen.getAllByText("Resources");
      const drawerResourcesBtn = resourcesButtons[resourcesButtons.length - 1];
      fireEvent.click(drawerResourcesBtn);
      expect(screen.getByText("Guides")).toBeInTheDocument();
    });
  });
});
