interface ComparisonRow {
  method: string;
  cost: string;
  time: string;
  notes: string;
}

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff" }}>
        <thead>
          <tr>
            {["Method", "Cost", "Time", "Notes"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "0.75rem",
                  borderBottom: "2px solid #E2E8F0",
                  fontWeight: 600,
                  color: "#1E293B",
                  fontSize: "14px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.method}>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#1E293B", fontWeight: row.method === "DormantFile" ? 600 : 400, fontSize: "14px" }}>
                {row.method}
              </td>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#475569", fontSize: "14px" }}>
                {row.cost}
              </td>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#475569", fontSize: "14px" }}>
                {row.time}
              </td>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#475569", fontSize: "14px" }}>
                {row.notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
