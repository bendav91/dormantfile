import { getMessagesList } from "@/lib/admin";
import { AdminMessageList } from "./AdminMessageList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages — Admin",
};

export default async function AdminMessagesPage() {
  const messages = await getMessagesList();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6 text-foreground">
        Messages
      </h2>

      {messages.length === 0 ? (
        <p className="text-sm text-muted">
          No messages yet.
        </p>
      ) : (
        <AdminMessageList
          messages={messages.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            message: m.message,
            readAt: m.readAt?.toISOString() ?? null,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
