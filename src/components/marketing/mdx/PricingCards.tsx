import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/cn";

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
          className={cn(
            "rounded-xl p-7 flex flex-col relative bg-card",
            plan.highlighted
              ? "border-2 border-primary"
              : "border border-border"
          )}
        >
          {plan.highlighted && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-card px-3.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
              Most popular
            </span>
          )}
          <p className="font-semibold text-sm mb-1 text-primary">
            {plan.name}
          </p>
          <div className="mb-1">
            <span className="text-4xl font-bold text-foreground">
              &pound;{plan.price}
            </span>
            <span className="text-sm ml-1 text-secondary">
              {plan.period}
            </span>
          </div>
          <p className="text-sm mb-6 text-secondary">
            {plan.description}
          </p>
          <ul className="space-y-2.5 mb-7 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle
                  size={16}
                  className="text-primary shrink-0 mt-0.5"
                />
                <span className="text-sm text-body">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className={cn(
              "block w-full text-center font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 text-[#ffffff] py-3 px-6 no-underline",
              plan.highlighted ? "bg-cta" : "bg-primary"
            )}
          >
            Get started
          </Link>
        </div>
      ))}
    </div>
  );
}
