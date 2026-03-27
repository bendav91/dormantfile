"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItemData {
  question: string;
  answer: React.ReactNode;
}

function FAQItem({ question, answer }: FAQItemData) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid #E2E8F0" }}>
      <button
        onClick={() => setOpen(!open)}
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
