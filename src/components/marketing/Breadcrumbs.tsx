import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap gap-2 list-none p-0 m-0 text-sm">
        <li>
          <Link href="/" className="text-secondary no-underline">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
            {item.href ? (
              <Link href={item.href} className="text-secondary no-underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-body">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
