import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface MicroTrustProps {
  icon: LucideIcon;
  text: string;
  className?: string;
}

export function MicroTrust({ icon: Icon, text, className = "" }: MicroTrustProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <Icon size={14} strokeWidth={2} />
      {text}
    </span>
  );
}
