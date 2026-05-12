import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import BroadcastForm from "@/components/broadcast-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Broadcast — Admin",
};

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminBroadcastPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const [recipientCount, me, recent] = await Promise.all([
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    }),
    prisma.broadcastEmail.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { sentBy: { select: { email: true } } },
    }),
  ]);

  if (!me) notFound();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6 text-foreground">Broadcast</h2>

      <BroadcastForm recipientCount={recipientCount} adminEmail={me.email} />

      <h3 className="text-base font-semibold mt-10 mb-4 text-foreground">Recent broadcasts</h3>
      {recent.length === 0 ? (
        <p className="text-sm text-muted">No broadcasts sent yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((b) => (
            <div
              key={b.id}
              className="p-3 rounded-lg bg-card border border-border flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <span className="text-xs text-muted">{formatDateTime(b.createdAt)}</span>
              <span className="text-sm font-semibold text-foreground flex-1 min-w-0">
                {b.subject}
              </span>
              <span className="text-xs text-secondary">
                {b.recipientCount} recipient{b.recipientCount === 1 ? "" : "s"}
                {b.sendErrors > 0 && (
                  <span className="text-danger"> · {b.sendErrors} failed</span>
                )}
              </span>
              <span className="text-xs text-muted">by {b.sentBy.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
