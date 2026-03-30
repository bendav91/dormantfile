import {
  emailShell,
  buildEmailChangeEmail,
  buildEmailChangeNotificationEmail,
  buildFilingConfirmationEmail,
  buildPasswordResetEmail,
  buildReminderEmail,
  buildVerificationEmail,
} from "@/lib/email/templates";
import { describe, expect, it } from "vitest";

describe("emailShell", () => {
  const baseHtml = emailShell({ content: "<p>Hello world</p>" });

  it("wraps content in a valid HTML document", () => {
    expect(baseHtml).toContain("<!DOCTYPE html>");
    expect(baseHtml).toContain('<html lang="en"');
    expect(baseHtml).toContain("</html>");
  });

  it("includes the logo image", () => {
    expect(baseHtml).toContain('alt="DormantFile"');
    expect(baseHtml).toContain("/logo.png");
  });

  it("includes dark mode CSS media query", () => {
    expect(baseHtml).toContain("prefers-color-scheme: dark");
  });

  it("includes the content passed in", () => {
    expect(baseHtml).toContain("<p>Hello world</p>");
  });

  it("includes footer with links and copyright", () => {
    expect(baseHtml).toContain("/answers");
    expect(baseHtml).toContain("/privacy");
    expect(baseHtml).toContain("/terms");
    expect(baseHtml).toContain(`© ${new Date().getFullYear()}`);
    expect(baseHtml).toContain("dormantfile.co.uk");
  });

  it("includes address placeholder in footer", () => {
    expect(baseHtml).toContain("Company address placeholder");
  });

  it("does NOT include unsubscribe link by default", () => {
    expect(baseHtml).not.toContain("Mute reminder emails");
  });

  it("includes unsubscribe link when includeUnsubscribe is true", () => {
    const html = emailShell({
      content: "<p>Reminder</p>",
      includeUnsubscribe: true,
      unsubscribeUrl: "https://example.com/mute?uid=123&exp=999&sig=abc",
    });
    expect(html).toContain("Mute reminder emails");
    expect(html).toContain("https://example.com/mute?uid=123&exp=999&sig=abc");
  });

  it("includes preheader text when provided", () => {
    const html = emailShell({
      content: "<p>Test</p>",
      preheader: "Preview text here",
    });
    expect(html).toContain("Preview text here");
  });
});

describe("buildReminderEmail", () => {
  const data = {
    userName: "Ben",
    dashboardUrl: "https://example.com/dashboard",
    sections: [
      {
        heading: "Due within 30 days",
        isOverdue: false,
        companies: [
          {
            companyName: "Acme Ltd",
            deadline: new Date("2027-03-31"),
            daysUntilDeadline: 25,
            fileUrl: "https://example.com/file/abc123",
          },
          {
            companyName: "Beta Co",
            deadline: new Date("2027-04-05"),
            daysUntilDeadline: 30,
            fileUrl: "https://example.com/file/def456",
          },
        ],
      },
    ],
  };

  it("subject reflects the number of companies", () => {
    const { subject } = buildReminderEmail(data);
    expect(subject).toContain("2 companies");
  });

  it("html contains all company names", () => {
    const { html } = buildReminderEmail(data);
    expect(html).toContain("Acme Ltd");
    expect(html).toContain("Beta Co");
  });

  it("html contains the section heading", () => {
    const { html } = buildReminderEmail(data);
    expect(html).toContain("Due within 30 days");
  });

  it("html contains file URLs", () => {
    const { html } = buildReminderEmail(data);
    expect(html).toContain("https://example.com/file/abc123");
    expect(html).toContain("https://example.com/file/def456");
  });

  it("html contains the dashboard link", () => {
    const { html } = buildReminderEmail(data);
    expect(html).toContain("https://example.com/dashboard");
  });

  it("uses overdue subject when sections include overdue", () => {
    const overdueData = {
      ...data,
      sections: [
        {
          heading: "Overdue: 7+ days past deadline",
          isOverdue: true,
          companies: [
            {
              companyName: "Late Corp",
              deadline: new Date("2026-03-01"),
              daysUntilDeadline: -28,
              fileUrl: "https://example.com/file/late1",
            },
          ],
        },
      ],
    };
    const { subject, html } = buildReminderEmail(overdueData);
    expect(subject).toContain("Action required");
    expect(html).toContain("Late Corp");
    expect(html).toContain("28 days overdue");
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

describe("buildPasswordResetEmail", () => {
  it("returns correct subject and includes reset URL in html", () => {
    const result = buildPasswordResetEmail({ resetUrl: "https://example.com/reset?token=abc" });
    expect(result.subject).toBe("Reset your DormantFile password");
    expect(result.html).toContain("https://example.com/reset?token=abc");
    expect(result.html).toContain("1 hour");
  });
});
