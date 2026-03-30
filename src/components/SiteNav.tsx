"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "@/components/sign-out-button";

// --- Types ---

type NavLink = { href: string; label: string };
type NavGroup = { label: string; children: NavLink[] };
type NavItem = NavLink | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

interface NavConfig {
  links: NavItem[];
  logoHref: string;
  cta: { href: string; label: string } | null;
  authLinks: NavLink[];
}

interface SiteNavProps {
  variant: "marketing" | "app";
  user?: { email: string };
}

// --- Configs ---

const MARKETING_CONFIG: NavConfig = {
  links: [
    { href: "/pricing", label: "Pricing" },
    {
      label: "Resources",
      children: [
        { href: "/guides", label: "Guides" },
        { href: "/answers", label: "Answers" },
        { href: "/faq", label: "FAQ" },
        { href: "/security", label: "Security" },
      ],
    },
  ],
  logoHref: "/",
  cta: { href: "/register", label: "Get started" },
  authLinks: [{ href: "/login", label: "Sign in" }],
};

const APP_CONFIG: NavConfig = {
  links: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
  ],
  logoHref: "/dashboard",
  cta: null,
  authLinks: [],
};

// --- Desktop Dropdown ---

function DesktopDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) close();
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-sm font-medium transition-colors duration-200 flex items-center gap-1"
        style={{
          color: "var(--color-text-primary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {group.label}
        <ChevronDown
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
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
          {group.children.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
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
  );
}

// --- SiteNav ---

export function SiteNav({ variant, user }: SiteNavProps) {
  const config = variant === "marketing" ? MARKETING_CONFIG : APP_CONFIG;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    setAccordionOpen(false);
  }, [pathname]);

  // Scroll lock
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Escape key and focus trap
  useEffect(() => {
    if (!drawerOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setAccordionOpen(false);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: logo + links */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <Link
            href={config.logoHref}
            style={{ display: "flex", alignItems: "center" }}
          >
            <Logo height={22} />
          </Link>
          <div
            className="hidden md:flex"
            style={{ alignItems: "center", gap: "24px" }}
          >
            {config.links.map((item) =>
              isNavGroup(item) ? (
                <DesktopDropdown key={item.label} group={item} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium transition-colors duration-200"
                  style={{
                    color: "var(--color-text-primary)",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          ref={hamburgerRef}
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          className="md:hidden"
          style={{
            color: "var(--color-text-primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          {drawerOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Right: desktop actions */}
        <div
          className="hidden md:flex"
          style={{ alignItems: "center", gap: "16px" }}
        >
          <ThemeToggle />
          {variant === "app" && user && (
            <span
              className="text-sm"
              style={{
                color: "var(--color-text-secondary)",
                maxWidth: "180px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </span>
          )}
          {variant === "app" && <SignOutButton />}
          {config.authLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors duration-200 nav-signin-link"
              style={{
                color: "var(--color-text-primary)",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}
          {config.cta && (
            <Link
              href={config.cta.href}
              className="text-sm font-semibold"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              {config.cta.label}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          onClick={closeDrawer}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            zIndex: 40,
            transition: "opacity 250ms ease-out",
          }}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal={drawerOpen}
        aria-label="Navigation menu"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "260px",
          backgroundColor: "var(--color-bg-card)",
          borderRight: "1px solid var(--color-border)",
          zIndex: 50,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <Link
            href={config.logoHref}
            onClick={closeDrawer}
            style={{ display: "flex", alignItems: "center" }}
          >
            <Logo height={22} />
          </Link>
          <button
            onClick={closeDrawer}
            aria-label="Close menu"
            style={{
              color: "var(--color-text-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer nav links */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {config.links.map((item) =>
            isNavGroup(item) ? (
              <div key={item.label}>
                <button
                  onClick={() => setAccordionOpen(!accordionOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    minHeight: "44px",
                  }}
                >
                  {item.label}
                  <ChevronDown
                    size={14}
                    style={{
                      transform: accordionOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                      color: "var(--color-text-muted)",
                    }}
                  />
                </button>
                {accordionOpen && (
                  <div style={{ padding: "0 0 4px 0" }}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={closeDrawer}
                        style={{
                          display: "block",
                          padding: "10px 20px 10px 36px",
                          fontSize: "14px",
                          color: "var(--color-text-body)",
                          textDecoration: "none",
                          minHeight: "44px",
                          lineHeight: "24px",
                        }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                style={{
                  display: "block",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  textDecoration: "none",
                  minHeight: "44px",
                  lineHeight: "20px",
                }}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        {/* Drawer footer */}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            <ThemeToggle />
            {variant === "app" && user && (
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </span>
            )}
          </div>

          {variant === "app" && <SignOutButton />}

          {config.authLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeDrawer}
              className="text-sm font-medium"
              style={{
                color: "var(--color-text-primary)",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}

          {config.cta && (
            <Link
              href={config.cta.href}
              onClick={closeDrawer}
              className="text-sm font-semibold text-center"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              {config.cta.label}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
