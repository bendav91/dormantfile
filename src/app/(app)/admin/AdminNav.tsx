"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Mail, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/filings", label: "Filings", icon: FileText },
  { href: "/admin/messages", label: "Messages", icon: Mail, showBadge: true },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
];

export function AdminNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-8 flex-wrap">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150 no-underline border",
              isActive
                ? "text-primary bg-primary-bg border-primary-border"
                : "text-secondary bg-transparent border-border"
            )}
          >
            <Icon size={14} />
            {item.label}
            {item.showBadge && unreadCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none bg-warning text-white">
                {unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
