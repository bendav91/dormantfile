"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItemData {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemData) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-${question.toLowerCase().replace(/\W+/g, "-").slice(0, 40)}`;
  const triggerId = `${panelId}-trigger`;

  return (
    <div style={{ borderBottom: "1px solid #E2E8F0" }}>
      <button
        id={triggerId}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "1rem 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "15px",
          fontWeight: 500,
          color: "#1E293B",
          gap: "1rem",
        }}
      >
        <span>{question}</span>
        <ChevronDown
          size={16}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
            color: "#94A3B8",
          }}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          style={{
            paddingBottom: "1rem",
            color: "#475569",
            lineHeight: 1.7,
            fontSize: "15px",
          }}
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
        <section key={cat.name} style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#1E293B",
              margin: "0 0 8px 0",
            }}
          >
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
