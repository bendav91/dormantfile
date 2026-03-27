import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: "1.5rem" }}>
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          listStyle: "none",
          padding: 0,
          margin: 0,
          fontSize: "0.875rem",
        }}
      >
        <li>
          <Link
            href="/"
            style={{ color: "#64748B", textDecoration: "none" }}
          >
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span aria-hidden="true" style={{ color: "#94A3B8" }}>
              ›
            </span>
            {item.href ? (
              <Link
                href={item.href}
                style={{ color: "#64748B", textDecoration: "none" }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: "#475569" }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
