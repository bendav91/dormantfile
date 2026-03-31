import Link from "next/link";
import { Logo } from "@/components/Logo";

// --- Types ---

interface FooterLink {
  href: string;
  label: string;
}

interface FooterLinkGroup {
  heading: string;
  links: FooterLink[];
}

interface FooterConfig {
  groups: FooterLinkGroup[];
  showBranding: boolean;
  tagline: string;
}

interface SiteFooterProps {
  variant: "marketing" | "app";
}

// --- Configs ---

const MARKETING_CONFIG: FooterConfig = {
  groups: [
    {
      heading: "Product",
      links: [
        { href: "/how-it-works", label: "How it works" },
        { href: "/pricing", label: "Pricing" },
        { href: "/faq", label: "FAQ" },
        { href: "/security", label: "Security" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { href: "/guides", label: "Guides" },
        { href: "/answers", label: "Answers" },
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: "/cookies", label: "Cookies" },
        { href: "/acceptable-use", label: "Acceptable use" },
        { href: "/refund", label: "Refund policy" },
      ],
    },
  ],
  showBranding: true,
  tagline:
    "Affordable dormant company filing for the UK. CT600 and annual accounts — filed directly with HMRC and Companies House.",
};

const APP_CONFIG: FooterConfig = {
  groups: [
    {
      heading: "",
      links: [
        { href: "/contact", label: "Help & contact" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: "/refund", label: "Refund policy" },
      ],
    },
  ],
  showBranding: false,
  tagline: "",
};

// --- SiteFooter ---

export function SiteFooter({ variant }: SiteFooterProps) {
  const config = variant === "marketing" ? MARKETING_CONFIG : APP_CONFIG;

  if (variant === "app") {
    return (
      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
        }}
        className="py-6 px-6"
      >
        <div className="max-w-[960px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-1">
            {config.groups[0].links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs transition-colors duration-200 hoverable-subtle"
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)", margin: 0 }}>
            &copy; {new Date().getFullYear()} DormantFile
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderTop: "1px solid var(--color-border)",
      }}
      className="py-12 sm:py-16 px-6"
    >
      <div className="max-w-[960px] mx-auto">
        {/* Top: branding + link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 sm:gap-8 mb-12">
          {/* Branding column */}
          {config.showBranding && (
            <div className="col-span-2 sm:col-span-1">
              <Link
                href="/"
                aria-label="DormantFile home"
                style={{ display: "inline-flex", alignItems: "center" }}
                className="mb-4 block"
              >
                <Logo height={20} />
              </Link>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--color-text-muted)", maxWidth: "240px" }}
              >
                {config.tagline}
              </p>
            </div>
          )}

          {/* Link columns */}
          {config.groups.map((group) => (
            <div key={group.heading}>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                {group.heading}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }} className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hoverable-subtle"
                      style={{
                        color: "var(--color-text-secondary)",
                        textDecoration: "none",
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom: copyright + disclaimer */}
        <div
          style={{ borderTop: "1px solid var(--color-border)" }}
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <p className="text-xs" style={{ color: "var(--color-text-muted)", margin: 0 }}>
            &copy; {new Date().getFullYear()} DormantFile. Not an accountancy firm &mdash; software
            tool only.
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)", margin: 0 }}>
            Made in the UK
          </p>
        </div>
      </div>
    </footer>
  );
}
