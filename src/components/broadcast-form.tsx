"use client";

import { useState } from "react";
import { AlertTriangle, Mail, Send } from "lucide-react";
import { cn } from "@/lib/cn";

interface SendResponse {
  ok: boolean;
  recipientCount?: number;
  sendErrors?: number;
  broadcastId?: string;
  recipient?: string;
  error?: string;
}

interface BroadcastFormProps {
  recipientCount: number;
  adminEmail: string;
}

export default function BroadcastForm({ recipientCount, adminEmail }: BroadcastFormProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const subjectLen = subject.length;
  const bodyLen = body.length;
  const disabled = busy !== null || subject.trim().length === 0 || body.trim().length === 0;

  async function submit(mode: "preview" | "send") {
    if (mode === "send") {
      const ok = window.confirm(
        `Send to ${recipientCount} verified customer${recipientCount === 1 ? "" : "s"}? This can't be undone.`,
      );
      if (!ok) return;
    }

    setBusy(mode);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, subject, bodyMarkdown: body }),
      });
      const data = (await res.json()) as SendResponse;

      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? `Request failed (${res.status})` });
        return;
      }

      if (mode === "preview") {
        setMessage({ kind: "ok", text: `Preview sent to ${data.recipient}.` });
      } else {
        const errs =
          (data.sendErrors ?? 0) > 0
            ? ` (${data.sendErrors} failed — check Vercel logs)`
            : "";
        setMessage({
          kind: "ok",
          text: `Sent to ${data.recipientCount} customer${data.recipientCount === 1 ? "" : "s"}${errs}.`,
        });
        setSubject("");
        setBody("");
      }
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 rounded-xl bg-warning-bg border border-warning-border">
        <div className="flex gap-2 items-start">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-warning leading-relaxed">
            <p className="m-0 font-semibold">Service emails only.</p>
            <p className="m-0 mt-1">
              Use this for account or service notices customers need to know about (terms changes,
              scheduled maintenance, security advisories). Marketing emails are <strong>not</strong>{" "}
              allowed here — they require explicit opt-in consent under PECR. See{" "}
              <a
                href="https://ico.org.uk/for-organisations/direct-marketing/"
                target="_blank"
                rel="noreferrer"
                className="text-warning underline"
              >
                ICO guidance
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card border border-border">
        <p className="text-xs text-secondary m-0">
          Will send to{" "}
          <strong className="text-foreground">
            {recipientCount} verified customer{recipientCount === 1 ? "" : "s"}
          </strong>
          . Preview goes to <strong className="text-foreground">{adminEmail}</strong>.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bcast-subject" className="text-xs font-semibold text-foreground">
          Subject{" "}
          <span className={cn("font-normal", subjectLen > 200 ? "text-danger" : "text-muted")}>
            ({subjectLen}/200)
          </span>
        </label>
        <input
          id="bcast-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          placeholder="Important update about your DormantFile account"
          className="w-full px-3 py-2 rounded-lg bg-inset border border-border text-sm text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="bcast-body" className="text-xs font-semibold text-foreground">
            Body (markdown){" "}
            <span className={cn("font-normal", bodyLen > 50_000 ? "text-danger" : "text-muted")}>
              ({bodyLen.toLocaleString()}/50,000)
            </span>
          </label>
          <details className="text-xs">
            <summary className="text-secondary cursor-pointer">Markdown cheatsheet</summary>
            <div className="mt-2 p-3 rounded-lg bg-inset text-secondary font-mono text-[11px] leading-relaxed">
              <div>**bold** &middot; *italic*</div>
              <div># Heading 1 &middot; ## Heading 2</div>
              <div>[link text](https://example.com)</div>
              <div>- bullet item</div>
              <div>1. numbered item</div>
              <div>&gt; blockquote</div>
            </div>
          </details>
        </div>
        <textarea
          id="bcast-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          placeholder={"Hi,\n\nWe wanted to let you know about an upcoming change to..."}
          className="w-full px-3 py-2 rounded-lg bg-inset border border-border text-sm text-foreground font-mono leading-relaxed"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => submit("preview")}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-[13px] border border-border bg-card text-foreground transition-opacity duration-200",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-90",
          )}
        >
          <Mail size={14} />
          {busy === "preview" ? "Sending preview…" : `Send preview to ${adminEmail}`}
        </button>
        <button
          type="button"
          onClick={() => submit("send")}
          disabled={disabled || recipientCount === 0}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-[13px] border-0 bg-cta text-card transition-opacity duration-200",
            disabled || recipientCount === 0
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:opacity-90",
          )}
        >
          <Send size={14} />
          {busy === "send" ? "Sending…" : `Send to all customers`}
        </button>
      </div>

      {message && (
        <p
          className={cn(
            "text-xs m-0",
            message.kind === "ok" ? "text-foreground" : "text-danger",
          )}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
