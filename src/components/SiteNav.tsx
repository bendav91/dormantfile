"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  HelpCircle,
  Menu,
  Shield,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "@/components/sign-out-button";

// --- Types ---

type NavLink = {
  href: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};
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

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// --- Configs ---

const MARKETING_CONFIG: NavConfig = {
  links: [
    { href: "/how-it-works", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/faq", label: "FAQ" },
    {
      label: "More",
      children: [
        {
          href: "/guides",
          label: "Guides",
          description: "Step-by-step filing walkthroughs",
          icon: BookOpen,
        },
        {
          href: "/answers",
          label: "Answers",
          description: "Quick answers to dormant filing",
          icon: HelpCircle,
        },
        {
          href: "/security",
          label: "Security",
          description: "How we protect your data",
          icon: Shield,
        },
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

function DesktopDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
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

  const hasActiveChild = group.children.some((c) =>
    isLinkActive(pathname, c.href)
  );

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
        className="text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer flex items-center gap-1 hoverable-subtle"
        style={{
          color: hasActiveChild
            ? "var(--color-primary)"
            : "var(--color-text-secondary)",
          backgroundColor:
            hasActiveChild || open ? "var(--color-primary-bg)" : "transparent",
          border: "none",
        }}
      >
        {group.label}
        <ChevronDown
          size={13}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 200ms",
            opacity: 0.5,
          }}
        />
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="rounded-xl"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            boxShadow:
              "0 8px 30px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)",
            width: "280px",
            padding: "6px",
            zIndex: 51,
          }}
        >
          {group.children.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-lg transition-all duration-150 hoverable-subtle"
                style={{
                  padding: "10px 12px",
                  color: "var(--color-text-body)",
                  textDecoration: "none",
                  backgroundColor: active
                    ? "var(--color-primary-bg)"
                    : "transparent",
                }}
              >
                {Icon && (
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      backgroundColor: "var(--color-bg-inset)",
                      marginTop: "1px",
                    }}
                  >
                    <Icon
                      size={16}
                      style={{
                        color: active
                          ? "var(--color-primary)"
                          : "var(--color-text-muted)",
                      }}
                    />
                  </div>
                )}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: active
                        ? "var(--color-primary)"
                        : "var(--color-text-primary)",
                      margin: 0,
                    }}
                  >
                    {item.label}
                  </p>
                  {item.description && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--color-text-muted)", margin: 0 }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- SiteNav ---

export function SiteNav({ variant, user }: SiteNavProps) {
  const config = variant === "marketing" ? MARKETING_CONFIG : APP_CONFIG;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, setAccordionOpen] = useState(false);
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
    <>
    <nav
      className="px-6"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor:
          "color-mix(in srgb, var(--color-bg-card) 80%, transparent)",
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Top bar */}
      <div className="max-w-[960px] mx-auto h-16 flex items-center justify-between">
        {/* Left: logo + links */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link
            href={config.logoHref}
            style={{ display: "flex", alignItems: "center" }}
          >
            <Logo height={22} />
          </Link>
          <div
            className="hidden lg:flex"
            style={{ alignItems: "center", gap: "4px" }}
          >
            {config.links.map((item) =>
              isNavGroup(item) ? (
                <DesktopDropdown
                  key={item.label}
                  group={item}
                  pathname={pathname}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 hoverable-subtle"
                  style={{
                    color: isLinkActive(pathname, item.href)
                      ? "var(--color-primary)"
                      : "var(--color-text-secondary)",
                    backgroundColor: isLinkActive(pathname, item.href)
                      ? "var(--color-primary-bg)"
                      : "transparent",
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
          className="lg:hidden flex items-center justify-center"
          style={{
            color: "var(--color-text-primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            width: "44px",
            height: "44px",
          }}
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Right: desktop actions */}
        <div
          className="hidden lg:flex"
          style={{ alignItems: "center", gap: "12px" }}
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
              className="text-sm font-medium transition-all duration-150 hoverable-subtle"
              style={{
                color: "var(--color-text-primary)",
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}
            >
              {link.label}
            </Link>
          ))}
          {config.cta && (
            <Link
              href={config.cta.href}
              className="text-sm font-semibold inline-flex items-center gap-1.5 transition-all duration-200 motion-safe:hover:-translate-y-0.5 cursor-pointer"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "8px",
                textDecoration: "none",
                boxShadow: "0 1px 3px rgba(249, 115, 22, 0.25)",
              }}
            >
              {config.cta.label}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </nav>

    {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          onClick={closeDrawer}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            zIndex: 40,
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
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
          width: "300px",
          maxWidth: "85vw",
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
            className="flex items-center justify-center"
            style={{
              color: "var(--color-text-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              width: "44px",
              height: "44px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer nav links */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {/* Main links */}
          <div style={{ marginBottom: "8px" }}>
            {config.links
              .filter((item) => !isNavGroup(item))
              .map((item) => {
                const link = item as NavLink;
                const active = isLinkActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeDrawer}
                    className="flex items-center rounded-lg transition-colors duration-150"
                    style={{
                      padding: "12px 12px",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: active
                        ? "var(--color-primary)"
                        : "var(--color-text-primary)",
                      backgroundColor: active
                        ? "var(--color-primary-bg)"
                        : "transparent",
                      textDecoration: "none",
                      minHeight: "44px",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
          </div>

          {/* Grouped links */}
          {config.links.filter(isNavGroup).map((item) => (
            <div key={item.label}>
              <div
                style={{
                  borderTop: "1px solid var(--color-border)",
                  paddingTop: "12px",
                  marginTop: "4px",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{
                    color: "var(--color-text-muted)",
                    padding: "4px 12px 8px",
                    margin: 0,
                  }}
                >
                  {item.label}
                </p>
                {item.children.map((child) => {
                  const Icon = child.icon;
                  const active = isLinkActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={closeDrawer}
                      className="flex items-center gap-3 rounded-lg transition-colors duration-150"
                      style={{
                        padding: "10px 12px",
                        textDecoration: "none",
                        minHeight: "44px",
                        backgroundColor: active
                          ? "var(--color-primary-bg)"
                          : "transparent",
                      }}
                    >
                      {Icon && (
                        <div
                          className="flex items-center justify-center flex-shrink-0"
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "var(--color-bg-inset)",
                          }}
                        >
                          <Icon
                            size={16}
                            style={{
                              color: active
                                ? "var(--color-primary)"
                                : "var(--color-text-muted)",
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{
                            color: active
                              ? "var(--color-primary)"
                              : "var(--color-text-primary)",
                            margin: 0,
                          }}
                        >
                          {child.label}
                        </p>
                        {child.description && (
                          <p
                            className="text-xs"
                            style={{
                              color: "var(--color-text-muted)",
                              margin: "1px 0 0 0",
                            }}
                          >
                            {child.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer footer */}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
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
              className="text-sm font-medium text-center"
              style={{
                color: "var(--color-text-primary)",
                textDecoration: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}
            >
              {link.label}
            </Link>
          ))}

          {config.cta && (
            <Link
              href={config.cta.href}
              onClick={closeDrawer}
              className="text-sm font-semibold text-center inline-flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "#ffffff",
                padding: "12px 20px",
                borderRadius: "8px",
                textDecoration: "none",
                boxShadow: "0 1px 3px rgba(249, 115, 22, 0.25)",
              }}
            >
              {config.cta.label}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
