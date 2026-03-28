"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/Logo";

export function MarketingNav() {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #E2E8F0",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold"
          style={{ color: "#2563EB", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Logo size={24} />
          DormantFile
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: "#1E293B", textDecoration: "none" }}
          >
            Pricing
          </Link>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="text-sm font-medium transition-colors duration-200 flex items-center gap-1"
              style={{
                color: "#1E293B",
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
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "0.5rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  minWidth: "10rem",
                  padding: "0.25rem 0",
                  zIndex: 51,
                }}
              >
                {[
                  { href: "/guides", label: "Guides" },
                  { href: "/answers", label: "Answers" },
                  { href: "/faq", label: "FAQ" },
                  { href: "/security", label: "Security" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setResourcesOpen(false)}
                    className="block text-sm transition-colors duration-200"
                    style={{
                      padding: "0.5rem 1rem",
                      color: "#475569",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/login"
            className="text-sm font-medium transition-colors duration-200 nav-signin-link"
            style={{ color: "#1E293B", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            style={{
              backgroundColor: "#F97316",
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
    </nav>
  );
}
