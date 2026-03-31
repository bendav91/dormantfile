"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div style={{ borderTop: "1px solid var(--color-border)" }}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.question} style={{ borderBottom: "1px solid var(--color-border)" }}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex items-center justify-between gap-4 w-full text-left py-5 cursor-pointer focus-ring rounded"
              style={{ background: "none", border: "none" }}
            >
              <span
                className="text-base font-semibold leading-snug"
                style={{ color: "var(--color-text-primary)" }}
              >
                {item.question}
              </span>
              <ChevronDown
                size={18}
                className="flex-shrink-0 transition-transform duration-200"
                style={{
                  color: "var(--color-text-muted)",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            <div
              style={{
                maxHeight: isOpen ? "200px" : "0px",
                overflow: "hidden",
                transition: "max-height 0.25s ease-out",
              }}
            >
              <p
                className="text-sm leading-relaxed pb-5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
