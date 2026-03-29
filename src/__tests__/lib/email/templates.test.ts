import { describe, it, expect } from "vitest";
import { buildReminderEmail, buildFilingConfirmationEmail } from "@/lib/email/templates";

describe("buildReminderEmail", () => {
  const data = {
    companyName: "Acme Ltd",
    daysUntilDeadline: 30,
    filingDeadline: new Date("2027-03-31"),
    fileUrl: "https://example.com/file/abc123",
  };

  it("subject contains the company name", () => {
    const { subject } = buildReminderEmail(data);
    expect(subject).toContain("Acme Ltd");
  });

  it("subject contains the days count", () => {
    const { subject } = buildReminderEmail(data);
    expect(subject).toContain("30");
  });

  it("html contains the company name", () => {
    const { html } = buildReminderEmail(data);
    expect(html).toContain("Acme Ltd");
  });

  it("html contains the file URL", () => {
    const { html } = buildReminderEmail(data);
    expect(html).toContain("https://example.com/file/abc123");
  });
});

describe("buildFilingConfirmationEmail", () => {
  const data = {
    companyName: "Acme Ltd",
    periodStart: new Date("2026-04-01"),
    periodEnd: new Date("2027-03-31"),
  };

  it("subject contains the company name", () => {
    const { subject } = buildFilingConfirmationEmail(data);
    expect(subject).toContain("Acme Ltd");
  });

  it("html contains the company name", () => {
    const { html } = buildFilingConfirmationEmail(data);
    expect(html).toContain("Acme Ltd");
  });
});
