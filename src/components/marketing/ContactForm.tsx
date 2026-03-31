"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-success font-medium text-[15px]">
        Thanks for your message. We&apos;ll get back to you soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="contact-name" className="sr-only">
        Your name
      </label>
      <input
        id="contact-name"
        type="text"
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        required
        autoComplete="name"
        className="focus-ring-input p-3 border border-border rounded-lg text-[15px] w-full font-[inherit]"
      />
      <label htmlFor="contact-email" className="sr-only">
        Your email
      </label>
      <input
        id="contact-email"
        type="email"
        placeholder="Your email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        required
        autoComplete="email"
        spellCheck={false}
        className="focus-ring-input p-3 border border-border rounded-lg text-[15px] w-full font-[inherit]"
      />
      <label htmlFor="contact-message" className="sr-only">
        Your message
      </label>
      <textarea
        id="contact-message"
        placeholder="Your message"
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        required
        rows={5}
        className="focus-ring-input p-3 border border-border rounded-lg text-[15px] w-full font-[inherit] resize-y"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className={cn(
          "focus-ring bg-primary text-white p-3 rounded-lg border-none font-semibold text-[15px] font-[inherit]",
          status === "sending" ? "cursor-not-allowed opacity-70" : "cursor-pointer opacity-100"
        )}
      >
        {status === "sending" ? "Sending\u2026" : "Send message"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-danger text-sm">
          Something went wrong. Please try emailing us directly.
        </p>
      )}
    </form>
  );
}
