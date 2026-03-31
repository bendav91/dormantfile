const THRESHOLD = 10;

export function FilingCounter() {
  const count = parseInt(process.env.NEXT_PUBLIC_FILING_COUNT || "0", 10);

  if (count < THRESHOLD) return null;

  return (
    <p className="text-sm font-medium text-center" style={{ color: "var(--color-text-secondary)" }}>
      Over {count.toLocaleString()} filings submitted
    </p>
  );
}
