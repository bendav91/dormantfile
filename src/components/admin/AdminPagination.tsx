import Link from "next/link";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

export function AdminPagination({ page, totalPages, baseUrl, searchParams = {} }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(targetPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(targetPage));
    return `${baseUrl}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
            style={{
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
            }}
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
            style={{
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
            }}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
