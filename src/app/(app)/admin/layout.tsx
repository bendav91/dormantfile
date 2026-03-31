import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { AdminNav } from "./AdminNav";

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

  let unreadCount = 0;
  try {
    unreadCount = await prisma.contactMessage.count({ where: { readAt: null } });
  } catch {
    // Table may not exist yet
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <h1 className="text-xl font-bold text-foreground">
          Admin
        </h1>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-bg text-primary">
          Admin
        </span>
      </div>

      <AdminNav unreadCount={unreadCount} />

      {children}
    </div>
  );
}
