import { Shield, Lock, Eye, Server } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { Shield, Lock, Eye, Server };

interface SecurityCard {
  icon: string;
  title: string;
  text: string;
}

export function SecurityCards({ cards }: { cards: SecurityCard[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
      {cards.map((card) => {
        const Icon = iconMap[card.icon];
        return (
          <div
            key={card.title}
            style={{
              padding: "1.25rem",
              border: "1px solid #E2E8F0",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              {Icon && <Icon size={24} style={{ color: "#2563EB" }} />}
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1E293B", margin: 0 }}>
                {card.title}
              </h3>
            </div>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", margin: 0 }}>
              {card.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
