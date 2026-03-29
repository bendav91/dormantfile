import {
  buildEmailChangeEmail,
  buildEmailChangeNotificationEmail,
  buildFilingConfirmationEmail,
  buildReminderEmail,
  buildVerificationEmail,
} from "@/lib/email/templates";
import { describe, expect, it } from "vitest";

describe("buildReminderEmail", () => {
  const data = {
    companyName: "Acme Ltd",
    daysUntilDeadline: 30,
    filingDeadline: new Date("2027-03-31"),
    fileUrl: "https://example.com/file/abc123",
    filingType: "accounts" as const,
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
    filingType: "accounts" as const,
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

describe("buildVerificationEmail", () => {
  it("returns correct subject and includes verify URL in html", () => {
    const result = buildVerificationEmail({ verifyUrl: "https://example.com/verify?token=abc" });
    expect(result.subject).toBe("Verify your email address");
    expect(result.html).toContain("https://example.com/verify?token=abc");
    expect(result.html).toContain("24 hours");
  });
});

describe("buildEmailChangeEmail", () => {
  it("returns correct subject and includes new email and verify URL", () => {
    const result = buildEmailChangeEmail({
      verifyUrl: "https://example.com/verify-change?token=abc",
      newEmail: "new@example.com",
    });
    expect(result.subject).toBe("Confirm your new email address");
    expect(result.html).toContain("new@example.com");
    expect(result.html).toContain("https://example.com/verify-change?token=abc");
  });
});

describe("buildEmailChangeNotificationEmail", () => {
  it("returns correct subject and includes new email", () => {
    const result = buildEmailChangeNotificationEmail({ newEmail: "new@example.com" });
    expect(result.subject).toBe("Email change requested on your DormantFile account");
    expect(result.html).toContain("new@example.com");
  });
});
