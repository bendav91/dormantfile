"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BookOpen, ChevronDown, HelpCircle, Menu, Shield, Star, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "@/components/sign-out-button";
import { cn } from "@/lib/cn";

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
  isAdmin?: boolean;
}

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// --- Configs ---

const MARKETING_CONFIG: NavConfig = {
  links: [
    { href: "/how-it-works", label: "How it works" },
    { href: "/features", label: "Features" },
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
        {
          href: "/reviews",
          label: "Reviews",
          description: "What our customers say",
          icon: Star,
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

function DesktopDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
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

  const hasActiveChild = group.children.some((c) => isLinkActive(pathname, c.href));

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
        className={cn(
          "text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer flex items-center gap-1 border-0 hoverable-subtle",
          hasActiveChild ? "text-primary bg-primary-bg" : "text-secondary bg-transparent",
          open && "bg-primary-bg",
        )}
      >
        {group.label}
        <ChevronDown
          size={13}
          className={cn(
            "opacity-50 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="rounded-xl absolute top-[calc(100%+8px)] right-0 bg-card border border-border shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08),0_2px_6px_-2px_rgba(0,0,0,0.04)] w-[280px] p-1.5 z-[51]"
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
                className={cn(
                  "flex items-start gap-3 rounded-lg transition-all duration-150 px-3 py-2.5 text-body no-underline hoverable-subtle",
                  active ? "bg-primary-bg" : "bg-transparent",
                )}
              >
                {Icon && (
                  <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-inset mt-px">
                    <Icon
                      size={16}
                      className={cn(active ? "text-primary" : "text-muted")}
                    />
                  </div>
                )}
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium m-0",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-xs mt-0.5 text-muted m-0">
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

export function SiteNav({ variant, user, isAdmin }: SiteNavProps) {
  const baseConfig = variant === "marketing" ? MARKETING_CONFIG : APP_CONFIG;
  const config = isAdmin
    ? { ...baseConfig, links: [...baseConfig.links, { href: "/admin", label: "Admin" }] }
    : baseConfig;

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
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
      <nav className="px-6 sticky top-0 z-50 bg-[color-mix(in_srgb,var(--color-bg-card)_80%,transparent)] backdrop-blur-[12px] backdrop-saturate-[180%] border-b border-border">
        {/* Top bar */}
        <div className="max-w-[960px] mx-auto h-16 flex items-center justify-between">
          {/* Left: logo + links */}
          <div className="flex items-center gap-6">
            <Link
              href={config.logoHref}
              aria-label="DormantFile home"
              className="flex items-center"
            >
              <Logo height={22} />
            </Link>
            <div className="hidden lg:flex items-center gap-1">
              {config.links.map((item) =>
                isNavGroup(item) ? (
                  <DesktopDropdown key={item.label} group={item} pathname={pathname} />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 no-underline hoverable-subtle",
                      isLinkActive(pathname, item.href)
                        ? "text-primary bg-primary-bg"
                        : "text-secondary bg-transparent",
                    )}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            className="lg:hidden flex items-center justify-center text-foreground bg-transparent border-0 cursor-pointer w-[44px] h-[44px]"
          >
            {drawerOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Right: desktop actions */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            {variant === "app" && user && (
              <span className="text-sm text-secondary max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                {user.email}
              </span>
            )}
            {variant === "app" && <SignOutButton />}
            {config.authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-all duration-150 text-foreground no-underline py-2 px-4 rounded-lg border border-border hoverable-subtle"
              >
                {link.label}
              </Link>
            ))}
            {config.cta && (
              <Link
                href={config.cta.href}
                className="text-sm font-semibold inline-flex items-center gap-1.5 transition-all duration-200 motion-safe:hover:-translate-y-0.5 cursor-pointer bg-cta text-white py-2 px-[18px] rounded-lg no-underline shadow-[0_1px_3px_rgba(249,115,22,0.25)]"
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
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[4px]"
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal={drawerOpen}
        aria-label="Navigation menu"
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[300px] max-w-[85vw] bg-card border-r border-border z-50 flex flex-col transition-transform duration-[250ms] ease-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <Link
            href={config.logoHref}
            onClick={closeDrawer}
            aria-label="DormantFile home"
            className="flex items-center"
          >
            <Logo height={22} />
          </Link>
          <button
            onClick={closeDrawer}
            aria-label="Close menu"
            className="flex items-center justify-center text-foreground bg-transparent border-0 cursor-pointer w-[44px] h-[44px]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer nav links */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Main links */}
          <div className="mb-2">
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
                    className={cn(
                      "flex items-center rounded-lg transition-colors duration-150 py-3 px-3 text-[15px] font-medium no-underline min-h-[44px]",
                      active ? "text-primary bg-primary-bg" : "text-foreground bg-transparent",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
          </div>

          {/* Grouped links */}
          {config.links.filter(isNavGroup).map((item) => (
            <div key={item.label}>
              <div className="border-t border-border pt-3 mt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted px-3 pt-1 pb-2 m-0">
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
                      className={cn(
                        "flex items-center gap-3 rounded-lg transition-colors duration-150 px-3 py-2.5 no-underline min-h-[44px]",
                        active ? "bg-primary-bg" : "bg-transparent",
                      )}
                    >
                      {Icon && (
                        <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-inset">
                          <Icon
                            size={16}
                            className={cn(active ? "text-primary" : "text-muted")}
                          />
                        </div>
                      )}
                      <div>
                        <p
                          className={cn(
                            "text-sm font-medium m-0",
                            active ? "text-primary" : "text-foreground",
                          )}
                        >
                          {child.label}
                        </p>
                        {child.description && (
                          <p className="text-xs text-muted mt-px m-0">
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
        <div className="border-t border-border p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {variant === "app" && user && (
              <span className="text-[13px] text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
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
              className="text-sm font-medium text-center text-foreground no-underline py-2.5 px-5 rounded-lg border border-border"
            >
              {link.label}
            </Link>
          ))}

          {config.cta && (
            <Link
              href={config.cta.href}
              onClick={closeDrawer}
              className="text-sm font-semibold text-center inline-flex items-center justify-center gap-1.5 bg-cta text-white py-3 px-5 rounded-lg no-underline shadow-[0_1px_3px_rgba(249,115,22,0.25)]"
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
