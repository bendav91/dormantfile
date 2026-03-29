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
          <Link href="/" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>
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
            <span aria-hidden="true" style={{ color: "var(--color-text-muted)" }}>
              ›
            </span>
            {item.href ? (
              <Link
                href={item.href}
                style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: "var(--color-text-body)" }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
