import { Shield, Lock, Eye, Server, Key } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { Shield, Lock, Eye, Server, Key };

interface SecurityCard {
  icon: string;
  title: string;
  text: string;
}

export function SecurityCards({ cards }: { cards: SecurityCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = iconMap[card.icon];
        return (
          <div
            key={card.title}
            className="p-5 border border-border rounded-lg bg-card"
          >
            <div className="flex items-center gap-3 mb-3">
              {Icon && <Icon size={24} className="text-primary" />}
              <h3 className="text-base font-semibold text-foreground m-0">
                {card.title}
              </h3>
            </div>
            <p className="text-[15px] leading-[1.7] text-body m-0">
              {card.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
