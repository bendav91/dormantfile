"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="border-t border-border">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.question} className="border-b border-border">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex items-center justify-between gap-4 w-full text-left py-5 cursor-pointer focus-ring rounded bg-transparent border-0"
            >
              <span className="text-base font-semibold leading-snug text-foreground">
                {item.question}
              </span>
              <ChevronDown
                size={18}
                className={cn(
                  "flex-shrink-0 transition-transform duration-200 text-muted",
                  isOpen && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-[max-height] duration-[250ms] ease-out",
                isOpen ? "max-h-[200px]" : "max-h-0"
              )}
            >
              <p className="text-sm leading-relaxed pb-5 text-secondary">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
