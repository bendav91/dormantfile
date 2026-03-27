import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function MarketingFooter() {
  return (
    <footer
      style={{
        backgroundColor: "#F1F5F9",
        borderTop: "1px solid #E2E8F0",
      }}
      className="py-8 px-6"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200"
              style={{ color: "#64748B", textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p
          className="text-center text-xs"
          style={{ color: "#94A3B8" }}
        >
          &copy; {new Date().getFullYear()} DormantFile. Not an accountancy firm
          &mdash; software tool only.
        </p>
      </div>
    </footer>
  );
}
