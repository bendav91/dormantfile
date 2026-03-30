import { Lock, MapPin, CreditCard, Shield } from "lucide-react";

const badges = [
  { icon: Shield, text: "HMRC GovTalk API" },
  { icon: Shield, text: "CH Software Filing API" },
  { icon: CreditCard, text: "Payments via Stripe" },
  { icon: Lock, text: "TLS encryption" },
  { icon: MapPin, text: "UK-based" },
];

export function TrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-8">
      {badges.map((badge) => (
        <span
          key={badge.text}
          className="inline-flex items-center gap-1.5 text-xs"
          style={{
            backgroundColor: "var(--color-bg-inset)",
            color: "var(--color-text-muted)",
            padding: "5px 12px",
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
          }}
        >
          <badge.icon size={12} strokeWidth={2} />
          {badge.text}
        </span>
      ))}
    </div>
  );
}
