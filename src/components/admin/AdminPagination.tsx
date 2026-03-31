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
      <p className="text-xs text-muted">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150 text-secondary border border-border no-underline"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150 text-secondary border border-border no-underline"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
