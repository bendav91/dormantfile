const badges = [
  "Stripe-secured payments",
  "UK-based",
  "Official HMRC & CH APIs",
  "TLS encrypted",
];

export function TrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-8">
      {badges.map((badge) => (
        <span
          key={badge}
          className="text-xs"
          style={{
            backgroundColor: "var(--color-bg-inset)",
            color: "var(--color-text-muted)",
            padding: "4px 12px",
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
          }}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}
