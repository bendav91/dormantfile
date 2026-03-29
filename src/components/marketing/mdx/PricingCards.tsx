import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export function PricingCards({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className="rounded-xl p-7 flex flex-col"
          style={{
            border: plan.highlighted
              ? "2px solid var(--color-primary)"
              : "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-card)",
            position: "relative",
          }}
        >
          {plan.highlighted && (
            <span
              style={{
                position: "absolute",
                top: "-12px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-bg-card)",
                padding: "3px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Most popular
            </span>
          )}
          <p className="font-semibold text-sm mb-1" style={{ color: "var(--color-primary)" }}>
            {plan.name}
          </p>
          <div className="mb-1">
            <span className="text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              &pound;{plan.price}
            </span>
            <span className="text-sm ml-1" style={{ color: "var(--color-text-secondary)" }}>
              {plan.period}
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            {plan.description}
          </p>
          <ul className="space-y-2.5 mb-7 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle
                  size={16}
                  style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }}
                />
                <span className="text-sm" style={{ color: "var(--color-text-body)" }}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="block w-full text-center font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundColor: plan.highlighted ? "var(--color-cta)" : "var(--color-primary)",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
        </div>
      ))}
    </div>
  );
}
