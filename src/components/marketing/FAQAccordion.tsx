"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface FAQItemData {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemData) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-${question.toLowerCase().replace(/\W+/g, "-").slice(0, 40)}`;
  const triggerId = `${panelId}-trigger`;

  return (
    <div className="border-b border-border">
      <button
        id={triggerId}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left py-4 bg-none border-none cursor-pointer flex justify-between items-center text-[15px] font-medium text-foreground gap-4"
      >
        <span>{question}</span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="pb-4 text-body leading-[1.7] text-[15px]"
        >
          {answer}
        </div>
      )}
    </div>
  );
}

interface FAQCategory {
  name: string;
  items: FAQItemData[];
}

export function FAQAccordion({ categories }: { categories: FAQCategory[] }) {
  return (
    <div>
      {categories.map((cat) => (
        <section key={cat.name} className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {cat.name}
          </h2>
          <div>
            {cat.items.map((item) => (
              <FAQItem key={item.question} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
