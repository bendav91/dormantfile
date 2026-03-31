import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";

const adminNavItems = [
  { href: "/admin/reviews", label: "Reviews", icon: Star },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Admin
        </h1>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--color-primary-bg)",
            color: "var(--color-primary)",
          }}
        >
          Admin
        </span>
      </div>

      <div className="flex gap-2 mb-8">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
              style={{
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
                textDecoration: "none",
              }}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
