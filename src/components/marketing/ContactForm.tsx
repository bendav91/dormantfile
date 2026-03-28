"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
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
      <p style={{ color: "#16A34A", fontWeight: 500, fontSize: "15px" }}>
        Thanks for your message. We&apos;ll get back to you soon.
      </p>
    );
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.75rem",
    border: "1px solid #E2E8F0",
    borderRadius: "0.5rem",
    fontSize: "15px",
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <label htmlFor="contact-name" className="sr-only">Your name</label>
      <input
        id="contact-name"
        type="text"
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        required
        autoComplete="name"
        className="focus-ring-input"
        style={inputStyle}
      />
      <label htmlFor="contact-email" className="sr-only">Your email</label>
      <input
        id="contact-email"
        type="email"
        placeholder="Your email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        required
        autoComplete="email"
        spellCheck={false}
        className="focus-ring-input"
        style={inputStyle}
      />
      <label htmlFor="contact-message" className="sr-only">Your message</label>
      <textarea
        id="contact-message"
        placeholder="Your message"
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        required
        rows={5}
        className="focus-ring-input"
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="focus-ring"
        style={{
          backgroundColor: "#2563EB",
          color: "#ffffff",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          border: "none",
          fontWeight: 600,
          fontSize: "15px",
          cursor: status === "sending" ? "not-allowed" : "pointer",
          opacity: status === "sending" ? 0.7 : 1,
          fontFamily: "inherit",
        }}
      >
        {status === "sending" ? "Sending\u2026" : "Send message"}
      </button>
      {status === "error" && (
        <p role="alert" style={{ color: "#DC2626", fontSize: "14px" }}>
          Something went wrong. Please try emailing us directly.
        </p>
      )}
    </form>
  );
}
