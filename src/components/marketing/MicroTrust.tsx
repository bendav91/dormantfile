import type { LucideIcon } from "lucide-react";

interface MicroTrustProps {
  icon: LucideIcon;
  text: string;
  className?: string;
}

export function MicroTrust({ icon: Icon, text, className = "" }: MicroTrustProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{ fontSize: "12px", color: "var(--color-text-muted)" }}
    >
      <Icon size={14} strokeWidth={2} />
      {text}
    </span>
  );
}
