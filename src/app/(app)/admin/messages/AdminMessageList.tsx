"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ExternalLink } from "lucide-react";

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export function AdminMessageList({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function toggleMessage(msg: Message) {
    const next = new Set(expanded);
    if (next.has(msg.id)) {
      next.delete(msg.id);
    } else {
      next.add(msg.id);
      // Mark as read
      if (!msg.readAt) {
        await fetch(`/api/admin/messages/${msg.id}`, { method: "PATCH" });
        router.refresh();
      }
    }
    setExpanded(next);
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
    >
      {messages.map((msg, i) => {
        const isOpen = expanded.has(msg.id);
        return (
          <div
            key={msg.id}
            style={{ borderBottom: i < messages.length - 1 ? "1px solid var(--color-border)" : "none" }}
          >
            <button
              onClick={() => toggleMessage(msg)}
              className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left transition-colors duration-150"
              style={{ background: "none", border: "none" }}
            >
              {!msg.readAt ? (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                />
              ) : (
                <span className="w-2 flex-shrink-0" />
              )}
              <Mail size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-medium"
                  style={{ color: msg.readAt ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}
                >
                  {msg.name}
                </span>
                <span className="text-xs ml-2" style={{ color: "var(--color-text-muted)" }}>
                  {msg.email}
                </span>
              </div>
              {!isOpen && (
                <span
                  className="text-xs truncate hidden sm:block"
                  style={{ color: "var(--color-text-muted)", maxWidth: "200px" }}
                >
                  {msg.message.length > 100 ? `${msg.message.slice(0, 100)}\u2026` : msg.message}
                </span>
              )}
              <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
                {formatRelative(msg.createdAt)}
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pl-12">
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap mb-3"
                  style={{ color: "var(--color-text-body)" }}
                >
                  {msg.message}
                </p>
                <a
                  href={`mailto:${msg.email}?subject=Re: Your message to DormantFile`}
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: "var(--color-primary)", textDecoration: "none" }}
                >
                  Reply <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}
