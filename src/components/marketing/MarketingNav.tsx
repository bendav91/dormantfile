"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";

const resourceLinks = [
  { href: "/guides", label: "Guides" },
  { href: "/answers", label: "Answers" },
  { href: "/faq", label: "FAQ" },
  { href: "/security", label: "Security" },
];

export function MarketingNav() {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeDropdown = useCallback(() => {
    setResourcesOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setResourcesOpen(false);
  }, []);

  return (
    <nav
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold"
          style={{
            color: "var(--color-primary)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Logo height={24} />
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="md:hidden"
          style={{
            color: "var(--color-text-primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
          >
            Pricing
          </Link>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              ref={triggerRef}
              onClick={() => setResourcesOpen(!resourcesOpen)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && resourcesOpen) {
                  closeDropdown();
                }
              }}
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              aria-controls="resources-menu"
              className="text-sm font-medium transition-colors duration-200 flex items-center gap-1"
              style={{
                color: "var(--color-text-primary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Resources
              <ChevronDown
                size={14}
                style={{
                  transform: resourcesOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>
            {resourcesOpen && (
              <div
                id="resources-menu"
                role="menu"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    closeDropdown();
                  }
                }}
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "0.5rem",
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  minWidth: "10rem",
                  padding: "0.25rem 0",
                  zIndex: 51,
                }}
              >
                {resourceLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setResourcesOpen(false)}
                    className="block text-sm transition-colors duration-200"
                    style={{
                      padding: "0.5rem 1rem",
                      color: "var(--color-text-body)",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium transition-colors duration-200 nav-signin-link"
            style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--color-cta)",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          className="md:hidden"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderTop: "1px solid var(--color-border)",
            padding: "0.75rem 1.5rem 1.25rem",
          }}
        >
          <div className="flex flex-col gap-4">
            <Link
              href="/pricing"
              onClick={closeMobileMenu}
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
            >
              Pricing
            </Link>
            <div>
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-sm font-medium flex items-center gap-1"
                style={{
                  color: "var(--color-text-primary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Resources
                <ChevronDown
                  size={14}
                  style={{
                    transform: resourcesOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {resourcesOpen && (
                <div className="flex flex-col gap-2 mt-2 pl-3">
                  {resourceLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="text-sm"
                      style={{
                        color: "var(--color-text-body)",
                        textDecoration: "none",
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              <ThemeToggle />
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="text-sm font-medium"
                style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
              >
                Sign in
              </Link>
            </div>
            <Link
              href="/register"
              onClick={closeMobileMenu}
              className="text-sm font-semibold text-center"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
