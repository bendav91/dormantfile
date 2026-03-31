import { getFilingsList } from "@/lib/admin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminFilingsTable } from "./AdminFilingsTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Filings — Admin",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "outstanding", label: "Outstanding" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "polling_timeout", label: "Polling timeout" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "stuck", label: "Stuck" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "accounts", label: "Accounts" },
  { value: "ct600", label: "CT600" },
];

const DEADLINE_OPTIONS = [
  { value: "all", label: "All deadlines" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due within 30 days" },
];

export default async function AdminFilingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const result = await getFilingsList({
    status: params.status,
    type: params.type,
    deadline: params.deadline,
    page: Number(params.page) || 1,
    sort: params.sort,
    order: params.order as "asc" | "desc",
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6 text-foreground">
        Filings
      </h2>

      <div className="flex flex-col gap-3 mb-6">
        <AdminFilters paramName="status" options={STATUS_OPTIONS} />
        <div className="flex gap-3 flex-wrap">
          <AdminFilters paramName="type" options={TYPE_OPTIONS} />
          <AdminFilters paramName="deadline" options={DEADLINE_OPTIONS} />
        </div>
      </div>

      <AdminFilingsTable filings={result.filings} />

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        baseUrl="/admin/filings"
        searchParams={params}
      />
    </div>
  );
}
