import { cn } from "@/lib/cn";

interface ComparisonRow {
  method: string;
  cost: string;
  time: string;
  notes: string;
}

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto mb-8">
      <table className="w-full border-collapse bg-card">
        <thead>
          <tr>
            {["Method", "Cost", "Time", "Notes"].map((h) => (
              <th
                key={h}
                className="text-left p-3 border-b-2 border-border font-semibold text-foreground text-sm"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.method}>
              <td
                className={cn(
                  "p-3 border-b border-border text-foreground text-sm",
                  row.method === "DormantFile" ? "font-semibold" : "font-normal"
                )}
              >
                {row.method}
              </td>
              <td className="p-3 border-b border-border text-body text-sm">
                {row.cost}
              </td>
              <td className="p-3 border-b border-border text-body text-sm">
                {row.time}
              </td>
              <td className="p-3 border-b border-border text-body text-sm">
                {row.notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
