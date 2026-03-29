import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/guides", label: "Guides" },
  { href: "/answers", label: "Answers" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/refund", label: "Refund Policy" },
];

export function MarketingFooter() {
  return (
    <footer
      style={{
        backgroundColor: "var(--color-neutral-bg)",
        borderTop: "1px solid var(--color-border)",
      }}
      className="py-8 px-6"
    >
      <div className="max-w-[960px] mx-auto">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200"
              style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p
          className="text-center text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          &copy; {new Date().getFullYear()} DormantFile. Not an accountancy firm
          &mdash; software tool only.
        </p>
      </div>
    </footer>
  );
}
