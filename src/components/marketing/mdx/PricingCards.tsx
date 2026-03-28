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
            border: plan.highlighted ? "2px solid #2563EB" : "1px solid #E2E8F0",
            backgroundColor: "#ffffff",
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
                backgroundColor: "#2563EB",
                color: "#ffffff",
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
          <p className="font-semibold text-sm mb-1" style={{ color: "#2563EB" }}>
            {plan.name}
          </p>
          <div className="mb-1">
            <span className="text-4xl font-bold" style={{ color: "#1E293B" }}>
              &pound;{plan.price}
            </span>
            <span className="text-sm ml-1" style={{ color: "#64748B" }}>
              {plan.period}
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>
            {plan.description}
          </p>
          <ul className="space-y-2.5 mb-7 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle size={16} style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }} />
                <span className="text-sm" style={{ color: "#475569" }}>{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="block w-full text-center font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundColor: plan.highlighted ? "#F97316" : "#2563EB",
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
