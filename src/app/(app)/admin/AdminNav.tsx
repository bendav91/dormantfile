"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
}

interface AdminNavProps {
  items: NavItem[];
  unreadCount: number;
}

export function AdminNav({ items, unreadCount }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-8 flex-wrap">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
              backgroundColor: isActive ? "var(--color-primary-bg)" : "transparent",
              border: `1px solid ${isActive ? "var(--color-primary-border)" : "var(--color-border)"}`,
              textDecoration: "none",
            }}
          >
            <Icon size={14} />
            {item.label}
            {item.showBadge && unreadCount > 0 && (
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  backgroundColor: "var(--color-warning)",
                  color: "#fff",
                  fontSize: "10px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
