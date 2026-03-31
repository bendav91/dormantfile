import Link from "next/link";
import { getCustomerList } from "@/lib/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminFilters } from "@/components/admin/AdminFilters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers — Admin",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "none", label: "No subscription" },
];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const result = await getCustomerList({
    q: params.q,
    filter: params.filter,
    page: Number(params.page) || 1,
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Customers
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <AdminSearch placeholder="Search by name, email, company name or CRN..." />
        </div>
        <AdminFilters paramName="filter" options={FILTER_OPTIONS} />
      </div>

      {result.users.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No customers found.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          {result.users.map((user, i) => (
            <Link
              key={user.id}
              href={`/admin/customers/${user.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hoverable-subtle"
              style={{
                borderBottom: i < result.users.length - 1 ? "1px solid var(--color-border)" : "none",
                textDecoration: "none",
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  {user.name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  {user.email}
                </p>
              </div>
              <StatusBadge status={user.subscriptionStatus} label={`${user.subscriptionTier !== "none" ? user.subscriptionTier + " — " : ""}${user.subscriptionStatus}`} />
              <div className="text-right hidden sm:block" style={{ minWidth: "80px" }}>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {user.companyCount} {user.companyCount === 1 ? "company" : "companies"}
                </p>
                {user.outstandingFilings > 0 && (
                  <p className="text-xs" style={{ color: "var(--color-warning)" }}>
                    {user.outstandingFilings} outstanding
                  </p>
                )}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: "var(--color-text-muted)", minWidth: "60px", textAlign: "right" }}>
                {formatRelative(user.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        baseUrl="/admin/customers"
        searchParams={params}
      />
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
