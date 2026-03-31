# Email Templates Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralise all emails behind a shared branded shell with dark mode, add 4 new transactional emails, and implement a reminder mute system.

**Architecture:** A single `emailShell()` function wraps all 10 templates. HMAC-signed mute links for reminders. Prisma migration adds `remindersMuted` to User. No new dependencies — uses Node `crypto` for HMAC, existing Resend for sending.

**Tech Stack:** TypeScript, Resend, Prisma, Next.js route handlers, Vitest

**Spec:** `docs/superpowers/specs/2026-03-30-email-templates-design.md`

---

## File Map

| File                                          | Action | Responsibility                                                |
| --------------------------------------------- | ------ | ------------------------------------------------------------- |
| `prisma/schema.prisma`                        | Modify | Add `remindersMuted` field to User                            |
| `src/lib/email/client.ts`                     | Modify | Add `headers` param to `sendEmail()`                          |
| `src/lib/email/templates.ts`                  | Modify | Add `emailShell()`, refactor 6 templates, add 4 new templates |
| `src/lib/email/mute-token.ts`                 | Create | HMAC token generation and verification for mute links         |
| `src/app/api/account/mute-reminders/route.ts` | Create | GET + POST handler for mute link clicks                       |
| `src/app/api/account/update-profile/route.ts` | Modify | Accept `remindersMuted` in PATCH body                         |
| `src/app/api/stripe/webhook/route.ts`         | Modify | Send payment failed + subscription cancelled emails           |
| `src/app/api/auth/verify-email/route.ts`      | Modify | Send welcome email after verification                         |
| `src/app/api/account/delete/route.ts`         | Modify | Send deletion confirmation email                              |
| `src/app/api/cron/reminders/route.ts`         | Modify | Filter muted users, pass unsubscribe URL, fix fallback domain |
| `src/app/(app)/settings/page.tsx`             | Modify | Pass `remindersMuted` to settings actions                     |
| `src/components/settings-actions.tsx`         | Modify | Add reminder toggle                                           |
| `src/__tests__/lib/email/templates.test.ts`   | Modify | Tests for shell, all 10 templates                             |
| `src/__tests__/lib/email/mute-token.test.ts`  | Create | Tests for HMAC token generation/verification                  |

---

## Task 1: Database Migration

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `remindersMuted` field to User model**

In `prisma/schema.prisma`, add this line to the `User` model after `filingAsAgent`:

```prisma
  remindersMuted     Boolean            @default(false)
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-reminders-muted
```

Expected: Migration creates successfully, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add remindersMuted field to User model"
```

---

## Task 2: Update `sendEmail` to support headers

**Files:**

- Modify: `src/lib/email/client.ts`

- [ ] **Step 1: Add `headers` parameter to `sendEmail`**

Replace the `sendEmail` function in `src/lib/email/client.ts` with:

```typescript
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    ...(html ? { html } : { text: text ?? "" }),
    ...(replyTo && { replyTo }),
    ...(headers && { headers }),
  });
}
```

- [ ] **Step 2: Run existing tests to verify no regression**

```bash
npm test
```

Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/client.ts
git commit -m "feat: add headers param to sendEmail for List-Unsubscribe support"
```

---

## Task 3: Build `emailShell()` with tests (TDD)

**Files:**

- Modify: `src/lib/email/templates.ts`
- Modify: `src/__tests__/lib/email/templates.test.ts`

- [ ] **Step 1: Write failing tests for `emailShell`**

Add to the top of `src/__tests__/lib/email/templates.test.ts`:

```typescript
import {
  emailShell,
  buildEmailChangeEmail,
  buildEmailChangeNotificationEmail,
  buildFilingConfirmationEmail,
  buildPasswordResetEmail,
  buildReminderEmail,
  buildVerificationEmail,
} from "@/lib/email/templates";

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: FAIL — `emailShell` is not exported.

- [ ] **Step 3: Implement `emailShell` in `src/lib/email/templates.ts`**

Add at the top of the file (after the `formatUKDate` helper):

```typescript
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
}

interface EmailShellOptions {
  content: string;
  preheader?: string;
  includeUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}

export function emailShell({
  content,
  preheader,
  includeUnsubscribe,
  unsubscribeUrl,
}: EmailShellOptions): string {
  const baseUrl = getBaseUrl();
  const year = new Date().getFullYear();

  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f8f9fa;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
    : "";

  const unsubscribeHtml =
    includeUnsubscribe && unsubscribeUrl
      ? `<br><a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Mute reminder emails</a>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #111827 !important; }
      .email-card { background-color: #1f2937 !important; }
      .email-header { border-bottom-color: #3b82f6 !important; }
      .email-footer { background-color: #111827 !important; border-top-color: #374151 !important; }
      .email-footer a { color: #6b7280 !important; }
      .email-footer-text { color: #6b7280 !important; }
      h1, h2, .heading-text { color: #f1f5f9 !important; }
      .body-text { color: #94a3b8 !important; }
      .secondary-text { color: #6b7280 !important; }
      .primary-button { background-color: #3b82f6 !important; }
      .primary-link { color: #60a5fa !important; }
      .overdue-text { color: #f87171 !important; }
      .divider { border-color: #374151 !important; }
      .table-bg { background-color: #1e293b !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;" class="email-body">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);" class="email-card">
          <!-- Header -->
          <tr>
            <td class="email-header" style="padding:28px 32px 20px;border-bottom:2px solid #2563eb;">
              <img src="${baseUrl}/logo.png" alt="DormantFile" width="140" style="display:block;height:auto;border:0;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:28px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p class="email-footer-text" style="color:#9ca3af;font-size:11px;line-height:1.8;margin:0;text-align:center;">
                <a href="${baseUrl}/answers" style="color:#9ca3af;text-decoration:none;">Help</a> &nbsp;&middot;&nbsp;
                <a href="${baseUrl}/privacy" style="color:#9ca3af;text-decoration:none;">Privacy</a> &nbsp;&middot;&nbsp;
                <a href="${baseUrl}/terms" style="color:#9ca3af;text-decoration:none;">Terms</a>
                <br>
                &copy; ${year} dormantfile.co.uk
                <br>
                <span style="color:#c0c5cc;">Company address placeholder</span>
                ${unsubscribeHtml}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: All `emailShell` tests pass. Existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/templates.ts src/__tests__/lib/email/templates.test.ts
git commit -m "feat: add emailShell wrapper with dark mode, logo, and legal footer"
```

---

## Task 4: Refactor 6 existing templates to use shell

**Files:**

- Modify: `src/lib/email/templates.ts`
- Modify: `src/__tests__/lib/email/templates.test.ts`

Each existing `build*Email` function currently builds a full `<!DOCTYPE html>` document. Refactor each to return only its inner content wrapped by `emailShell()`.

- [ ] **Step 1: Refactor `buildVerificationEmail`**

Replace the `html` assignment in `buildVerificationEmail` with:

```typescript
const html = emailShell({
  preheader: "Verify your email to activate your DormantFile account",
  content: `
    <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Verify your email address</h1>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Thanks for registering with DormantFile. Click the button below to verify
      your email address and activate your account.
    </p>
    <p>
      <a href="${verifyUrl}" class="primary-button" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
        Verify Email Address
      </a>
    </p>
    <p class="secondary-text" style="color:#9ca3af;font-size:12px;margin-top:20px;">
      This link expires in <strong>24 hours</strong>. If you did not create a
      DormantFile account, you can safely ignore this email.
    </p>`,
});
```

- [ ] **Step 2: Refactor `buildPasswordResetEmail`**

Replace the `html` assignment in `buildPasswordResetEmail` with:

```typescript
const html = emailShell({
  preheader: "Reset your DormantFile password",
  content: `
    <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Reset your password</h1>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      We received a request to reset the password for your DormantFile account.
      Click the button below to set a new password.
    </p>
    <p>
      <a href="${resetUrl}" class="primary-button" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
        Reset Password
      </a>
    </p>
    <p class="secondary-text" style="color:#9ca3af;font-size:12px;margin-top:20px;">
      This link expires in <strong>1 hour</strong>. If you did not request a
      password reset, you can safely ignore this email.
    </p>`,
});
```

- [ ] **Step 3: Refactor `buildEmailChangeEmail`**

Replace the `html` assignment with shell-wrapped version:

```typescript
const html = emailShell({
  preheader: "Confirm your new email address for DormantFile",
  content: `
    <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Confirm your new email address</h1>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      We received a request to change the email address on your DormantFile
      account to <strong>${newEmail}</strong>. Click the button below to confirm
      this change.
    </p>
    <p>
      <a href="${verifyUrl}" class="primary-button" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
        Confirm New Email Address
      </a>
    </p>
    <p class="secondary-text" style="color:#9ca3af;font-size:12px;margin-top:20px;">
      This link expires in <strong>24 hours</strong>. If you did not request
      this change, you can safely ignore this email.
    </p>`,
});
```

- [ ] **Step 4: Refactor `buildEmailChangeNotificationEmail`**

Replace the `html` assignment:

```typescript
const html = emailShell({
  preheader: "An email change was requested on your DormantFile account",
  content: `
    <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Email change requested</h1>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      A request was made to change the email address on your DormantFile account
      to <strong>${newEmail}</strong>.
    </p>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      A confirmation link has been sent to the new address. The change will only
      take effect once confirmed.
    </p>
    <p class="secondary-text" style="color:#9ca3af;font-size:12px;">
      If you did not make this request, please secure your account immediately
      by resetting your password.
    </p>`,
});
```

- [ ] **Step 5: Refactor `buildFilingConfirmationEmail`**

Replace the `html` assignment:

```typescript
const html = emailShell({
  preheader: `${filingLabel} filed successfully for ${companyName}`,
  content: `
    <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">${filingLabel} Filed Successfully</h1>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
      The ${filingLabel} for <strong>${companyName}</strong> has
      been successfully filed with ${authority}.
    </p>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 8px;">
      <strong>Accounting period:</strong> ${startFormatted} to ${endFormatted}
    </p>
    <p class="secondary-text" style="color:#9ca3af;font-size:12px;">
      If you have additional outstanding periods, they are available on your
      dashboard. You will receive a reminder when the next filing deadline is
      approaching.
    </p>`,
});
```

- [ ] **Step 6: Refactor `buildReminderEmail`**

This one needs `includeUnsubscribe`. Update the function signature to accept an optional `unsubscribeUrl` parameter:

```typescript
interface ReminderEmailData {
  userName: string;
  dashboardUrl: string;
  sections: ReminderSection[];
  unsubscribeUrl?: string;
}
```

Replace the `html` assignment at the end of the function:

```typescript
const html = emailShell({
  preheader: hasOverdue
    ? "You have overdue company filings"
    : `${pluralise(totalCompanies, "company", "companies")} ${totalCompanies === 1 ? "needs" : "need"} filing attention`,
  includeUnsubscribe: !!data.unsubscribeUrl,
  unsubscribeUrl: data.unsubscribeUrl,
  content: `
    <h1 class="heading-text" style="color:#1a1a1a;font-size:22px;margin:0 0 12px;">Filing ${hasOverdue ? "Action Required" : "Reminders"}</h1>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">Hi ${userName},</p>
    <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">Here's a summary of your companies that need filing attention:</p>
    ${sectionsHtml}
    <p class="secondary-text" style="color:#9ca3af;font-size:12px;margin:0 0 24px;">
      <strong>Note:</strong> ${penaltyNote}
    </p>
    <p>
      <a href="${dashboardUrl}" class="primary-button" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
        View Dashboard
      </a>
    </p>`,
});
```

Also update the `sectionsHtml` table rows to include dark mode classes:

```typescript
const rowsHtml = section.companies
  .map((c) => {
    const deadlineStr = formatUKDate(c.deadline);
    const daysAbs = Math.abs(c.daysUntilDeadline);
    const timing =
      c.daysUntilDeadline < 0
        ? `${pluralise(daysAbs, "day")} overdue`
        : `${pluralise(daysAbs, "day")} remaining`;

    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;" class="divider">
        <strong class="heading-text" style="color:#1a1a1a;">${c.companyName}</strong><br>
        <span class="secondary-text" style="color:#666;font-size:13px;">Deadline: ${deadlineStr} (${timing})</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:middle;" class="divider">
        <a href="${c.fileUrl}" class="primary-link" style="color:#2563eb;font-weight:600;text-decoration:none;font-size:13px;">File now</a>
      </td>
    </tr>`;
  })
  .join("");

return `<div style="margin-bottom:28px;">
  <h2 class="${section.isOverdue ? "overdue-text" : "heading-text"}" style="color:${section.isOverdue ? "#dc2626" : "#1a1a1a"};font-size:16px;margin:0 0 10px;">
    ${section.heading} (${pluralise(section.companies.length, "company", "companies")})
  </h2>
  <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;" class="table-bg">
    ${rowsHtml}
  </table>
</div>`;
```

- [ ] **Step 7: Run all tests to verify refactored templates still pass**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: All existing tests still pass. Templates now include shell wrapper (logo, dark mode, footer) but content assertions still match.

- [ ] **Step 8: Add missing `buildPasswordResetEmail` test**

Add to `src/__tests__/lib/email/templates.test.ts`:

```typescript
describe("buildPasswordResetEmail", () => {
  it("returns correct subject and includes reset URL in html", () => {
    const result = buildPasswordResetEmail({ resetUrl: "https://example.com/reset?token=abc" });
    expect(result.subject).toBe("Reset your DormantFile password");
    expect(result.html).toContain("https://example.com/reset?token=abc");
    expect(result.html).toContain("1 hour");
  });
});
```

- [ ] **Step 9: Run tests**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: All pass including the new password reset test.

- [ ] **Step 10: Commit**

```bash
git add src/lib/email/templates.ts src/__tests__/lib/email/templates.test.ts
git commit -m "refactor: migrate all 6 email templates to shared emailShell wrapper"
```

---

## Task 5: HMAC mute token utility (TDD)

**Files:**

- Create: `src/lib/email/mute-token.ts`
- Create: `src/__tests__/lib/email/mute-token.test.ts`

- [ ] **Step 1: Write failing tests for mute token**

Create `src/__tests__/lib/email/mute-token.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateMuteUrl, verifyMuteToken } from "@/lib/email/mute-token";

// Set a test secret
const TEST_SECRET = "test-secret-for-hmac";

describe("generateMuteUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("generates a URL with uid, exp, and sig params", () => {
    const url = generateMuteUrl("user-123");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("uid")).toBe("user-123");
    expect(parsed.searchParams.get("exp")).toBeTruthy();
    expect(parsed.searchParams.get("sig")).toBeTruthy();
    expect(parsed.pathname).toBe("/api/account/mute-reminders");
  });

  it("expiry is approximately 7 days from now", () => {
    const url = generateMuteUrl("user-123");
    const parsed = new URL(url);
    const exp = parseInt(parsed.searchParams.get("exp")!);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(exp).toBeGreaterThan(Date.now());
    expect(exp).toBeLessThanOrEqual(Date.now() + sevenDaysMs + 1000);
  });
});

describe("verifyMuteToken", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns userId for a valid token", () => {
    const url = generateMuteUrl("user-456");
    const parsed = new URL(url);
    const result = verifyMuteToken(
      parsed.searchParams.get("uid")!,
      parsed.searchParams.get("exp")!,
      parsed.searchParams.get("sig")!,
    );
    expect(result).toEqual({ valid: true, userId: "user-456" });
  });

  it("rejects an expired token", () => {
    const url = generateMuteUrl("user-456");
    const parsed = new URL(url);
    // Tamper with expiry to be in the past
    const result = verifyMuteToken(
      parsed.searchParams.get("uid")!,
      "1000000000000", // past timestamp
      parsed.searchParams.get("sig")!,
    );
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("rejects a tampered signature", () => {
    const url = generateMuteUrl("user-789");
    const parsed = new URL(url);
    const result = verifyMuteToken(
      parsed.searchParams.get("uid")!,
      parsed.searchParams.get("exp")!,
      "tampered-signature",
    );
    expect(result).toEqual({ valid: false, reason: "invalid" });
  });

  it("rejects a tampered userId", () => {
    const url = generateMuteUrl("user-original");
    const parsed = new URL(url);
    const result = verifyMuteToken(
      "user-attacker",
      parsed.searchParams.get("exp")!,
      parsed.searchParams.get("sig")!,
    );
    expect(result).toEqual({ valid: false, reason: "invalid" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/lib/email/mute-token.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/email/mute-token.ts`**

```typescript
import { createHmac, timingSafeEqual } from "crypto";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for mute tokens");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("hex");
}

export function generateMuteUrl(userId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
  const exp = (Date.now() + SEVEN_DAYS_MS).toString();
  const sig = sign(`${userId}:mute-reminders:${exp}`);
  return `${baseUrl}/api/account/mute-reminders?uid=${encodeURIComponent(userId)}&exp=${exp}&sig=${sig}`;
}

type VerifyResult =
  | { valid: true; userId: string }
  | { valid: false; reason: "expired" | "invalid" };

export function verifyMuteToken(uid: string, exp: string, sig: string): VerifyResult {
  const expiry = parseInt(exp, 10);
  if (isNaN(expiry) || expiry < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  const expected = sign(`${uid}:mute-reminders:${exp}`);
  const sigBuffer = Buffer.from(sig, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "invalid" };
  }

  return { valid: true, userId: uid };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/lib/email/mute-token.test.ts
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/mute-token.ts src/__tests__/lib/email/mute-token.test.ts
git commit -m "feat: add HMAC mute token generation and verification"
```

---

## Task 6: Add 4 new email templates (TDD)

**Files:**

- Modify: `src/lib/email/templates.ts`
- Modify: `src/__tests__/lib/email/templates.test.ts`

- [ ] **Step 1: Write failing tests for all 4 new templates**

Add to `src/__tests__/lib/email/templates.test.ts`:

```typescript
import {
  emailShell,
  buildEmailChangeEmail,
  buildEmailChangeNotificationEmail,
  buildFilingConfirmationEmail,
  buildPasswordResetEmail,
  buildReminderEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
  buildPaymentFailedEmail,
  buildSubscriptionCancelledEmail,
  buildAccountDeletedEmail,
} from "@/lib/email/templates";

describe("buildWelcomeEmail", () => {
  it("returns correct subject", () => {
    const { subject } = buildWelcomeEmail({
      userName: "Ben",
      dashboardUrl: "https://example.com/dashboard",
    });
    expect(subject).toBe("Welcome to DormantFile");
  });

  it("html includes greeting and CTA", () => {
    const { html } = buildWelcomeEmail({
      userName: "Ben",
      dashboardUrl: "https://example.com/dashboard",
    });
    expect(html).toContain("Ben");
    expect(html).toContain("https://example.com/dashboard");
    expect(html).toContain("Add Your First Company");
  });
});

describe("buildPaymentFailedEmail", () => {
  it("returns correct subject", () => {
    const { subject } = buildPaymentFailedEmail({ settingsUrl: "https://example.com/settings" });
    expect(subject).toContain("Payment failed");
  });

  it("html includes settings link", () => {
    const { html } = buildPaymentFailedEmail({ settingsUrl: "https://example.com/settings" });
    expect(html).toContain("https://example.com/settings");
    expect(html).toContain("Update Payment Method");
  });
});

describe("buildSubscriptionCancelledEmail", () => {
  it("returns correct subject", () => {
    const { subject } = buildSubscriptionCancelledEmail({
      choosePlanUrl: "https://example.com/choose-plan",
    });
    expect(subject).toContain("subscription has ended");
  });

  it("html explains what is preserved and lost", () => {
    const { html } = buildSubscriptionCancelledEmail({
      choosePlanUrl: "https://example.com/choose-plan",
    });
    expect(html).toContain("preserved");
    expect(html).toContain("Resubscribe");
    expect(html).toContain("https://example.com/choose-plan");
  });
});

describe("buildAccountDeletedEmail", () => {
  it("returns correct subject", () => {
    const { subject } = buildAccountDeletedEmail({ contactUrl: "https://example.com/contact" });
    expect(subject).toContain("deleted");
  });

  it("html confirms deletion", () => {
    const { html } = buildAccountDeletedEmail({ contactUrl: "https://example.com/contact" });
    expect(html).toContain("permanently deleted");
    expect(html).toContain("https://example.com/contact");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement all 4 new templates in `src/lib/email/templates.ts`**

Add at the end of the file:

```typescript
interface WelcomeEmailData {
  userName: string;
  dashboardUrl: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData) {
  const { userName, dashboardUrl } = data;
  const baseUrl = getBaseUrl();

  return {
    subject: "Welcome to DormantFile",
    html: emailShell({
      preheader: "Your account is verified and ready to use",
      content: `
        <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Welcome to DormantFile</h1>
        <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
          Hi ${userName}, your account is verified and ready to use.
        </p>
        <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
          DormantFile helps you file dormant company returns with HMRC and Companies House quickly and affordably.
        </p>
        <p>
          <a href="${dashboardUrl}" class="primary-button" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
            Add Your First Company
          </a>
        </p>
        <p class="secondary-text" style="color:#9ca3af;font-size:12px;margin-top:20px;">
          Need help? Check our <a href="${baseUrl}/answers" class="primary-link" style="color:#2563eb;">answers</a>.
        </p>`,
    }),
  };
}

interface PaymentFailedEmailData {
  settingsUrl: string;
}

export function buildPaymentFailedEmail(data: PaymentFailedEmailData) {
  return {
    subject: "Payment failed — action required",
    html: emailShell({
      preheader: "We couldn't process your latest payment",
      content: `
        <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Payment failed</h1>
        <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
          We couldn't process your latest payment. Your filing access will be
          paused if this isn't resolved.
        </p>
        <p>
          <a href="${data.settingsUrl}" class="primary-button" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
            Update Payment Method
          </a>
        </p>
        <p class="secondary-text" style="color:#9ca3af;font-size:12px;margin-top:20px;">
          If your payment details are up to date, your bank may have declined
          the charge. Please try again or use a different card.
        </p>`,
    }),
  };
}

interface SubscriptionCancelledEmailData {
  choosePlanUrl: string;
}

export function buildSubscriptionCancelledEmail(data: SubscriptionCancelledEmailData) {
  return {
    subject: "Your DormantFile subscription has ended",
    html: emailShell({
      preheader: "Your subscription has ended — here's what that means",
      content: `
        <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Your subscription has ended</h1>
        <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 12px;">
          <strong>What's preserved:</strong> Your filing history and company records remain accessible.
        </p>
        <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
          <strong>What changes:</strong> You can no longer submit new filings, and deadline reminders are paused.
        </p>
        <p>
          <a href="${data.choosePlanUrl}" class="primary-button" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
            Resubscribe
          </a>
        </p>`,
    }),
  };
}

interface AccountDeletedEmailData {
  contactUrl: string;
}

export function buildAccountDeletedEmail(data: AccountDeletedEmailData) {
  return {
    subject: "Your DormantFile account has been deleted",
    html: emailShell({
      preheader: "Your account and data have been permanently deleted",
      content: `
        <h1 class="heading-text" style="color:#1a1a1a;font-size:20px;margin:0 0 12px;">Account deleted</h1>
        <p class="body-text" style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;">
          Your DormantFile account and all associated data have been permanently deleted.
          This includes your company records, filing history, and payment information.
        </p>
        <p class="secondary-text" style="color:#9ca3af;font-size:12px;">
          If you didn't request this, please
          <a href="${data.contactUrl}" class="primary-link" style="color:#2563eb;">contact us</a> immediately.
        </p>`,
    }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: All 10 template test suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/templates.ts src/__tests__/lib/email/templates.test.ts
git commit -m "feat: add welcome, payment failed, subscription cancelled, and account deleted emails"
```

---

## Task 7: Mute reminders route

**Files:**

- Create: `src/app/api/account/mute-reminders/route.ts`

- [ ] **Step 1: Create the route handler**

Create `src/app/api/account/mute-reminders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMuteToken } from "@/lib/email/mute-token";

/**
 * Validates the mute token and mutes the user's reminders.
 * Returns a NextResponse error on failure, or null on success.
 */
async function handleMute(req: NextRequest): Promise<NextResponse | null> {
  const uid = req.nextUrl.searchParams.get("uid");
  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");

  if (!uid || !exp || !sig) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = verifyMuteToken(uid, exp, sig);

  if (!result.valid) {
    const message = result.reason === "expired" ? "This link has expired" : "Invalid link";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { remindersMuted: true },
  });

  return null; // success
}

export async function GET(req: NextRequest) {
  const error = await handleMute(req);
  if (error) return error;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
  return NextResponse.redirect(`${baseUrl}/settings?reminders=muted`);
}

export async function POST(req: NextRequest) {
  const error = await handleMute(req);
  if (error) return error;

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/account/mute-reminders/route.ts
git commit -m "feat: add mute-reminders route (GET + POST)"
```

---

## Task 7b: Mute route integration tests

**Files:**

- Create: `src/__tests__/app/api/account/mute-reminders.test.ts`

Note: These tests exercise the token verification and response logic. Since they involve Prisma, they mock `@/lib/db`. The HMAC logic itself is already unit-tested in Task 5.

- [ ] **Step 1: Write mute route tests**

Create `src/__tests__/app/api/account/mute-reminders.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateMuteUrl } from "@/lib/email/mute-token";

const TEST_SECRET = "test-secret-for-hmac";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("mute-reminders route", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("GET with valid token returns redirect", async () => {
    const { GET } = await import("@/app/api/account/mute-reminders/route");
    const url = generateMuteUrl("user-123");
    const req = new Request(url, { method: "GET" });
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);

    const response = await GET(nextReq);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/settings?reminders=muted");
  });

  it("POST with valid token returns 200 JSON", async () => {
    const { POST } = await import("@/app/api/account/mute-reminders/route");
    const url = generateMuteUrl("user-456");
    const req = new Request(url, { method: "POST" });
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);

    const response = await POST(nextReq);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("rejects missing parameters with 400", async () => {
    const { GET } = await import("@/app/api/account/mute-reminders/route");
    const req = new Request("https://example.com/api/account/mute-reminders", { method: "GET" });
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);

    const response = await GET(nextReq);
    expect(response.status).toBe(400);
  });

  it("rejects tampered signature with 400", async () => {
    const { GET } = await import("@/app/api/account/mute-reminders/route");
    const url = generateMuteUrl("user-789");
    const tampered = url.replace(/sig=[^&]+/, "sig=tampered");
    const req = new Request(tampered, { method: "GET" });
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(req);

    const response = await GET(nextReq);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/__tests__/app/api/account/mute-reminders.test.ts
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/app/api/account/mute-reminders.test.ts
git commit -m "test: add mute-reminders route integration tests"
```

---

## Task 8: Wire up reminders cron with mute filter and unsubscribe URL

**Files:**

- Modify: `src/app/api/cron/reminders/route.ts`

- [ ] **Step 1: Add import for `generateMuteUrl`**

Add to the imports at the top of `src/app/api/cron/reminders/route.ts`:

```typescript
import { generateMuteUrl } from "@/lib/email/mute-token";
```

- [ ] **Step 2: Fix fallback domain**

Change line 77 from:

```typescript
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormantfile.com";
```

to:

```typescript
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormantfile.co.uk";
```

- [ ] **Step 3: Add `remindersMuted: false` to the filing query filter**

In the `prisma.filing.findMany` call, add `remindersMuted: false` to the `user` filter within `company`. Change:

```typescript
user: { subscriptionStatus: { in: ["active", "cancelling"] } },
```

to:

```typescript
user: { subscriptionStatus: { in: ["active", "cancelling"] }, remindersMuted: false },
```

- [ ] **Step 4: Pass `unsubscribeUrl` to `buildReminderEmail` and add `List-Unsubscribe` headers**

First, change the loop at line 123 from `for (const userData of userMap.values())` to:

```typescript
for (const [userId, userData] of userMap.entries()) {
```

Then replace the email building and sending section:

```typescript
const { subject, html } = buildReminderEmail({
  userName: userData.name,
  dashboardUrl: `${appUrl}/dashboard`,
  sections: emailSections,
});

await sendEmail({ to: userData.email, subject, html });
```

with:

```typescript
const unsubscribeUrl = generateMuteUrl(userId);

const { subject, html } = buildReminderEmail({
  userName: userData.name,
  dashboardUrl: `${appUrl}/dashboard`,
  sections: emailSections,
  unsubscribeUrl,
});

await sendEmail({
  to: userData.email,
  subject,
  html,
  headers: {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
});
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/reminders/route.ts
git commit -m "feat: filter muted users from reminders, add List-Unsubscribe headers"
```

---

## Task 9: Wire up Stripe webhook emails

**Files:**

- Modify: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Add email imports**

Add to the imports at the top:

```typescript
import { sendEmail } from "@/lib/email/client";
import { buildPaymentFailedEmail, buildSubscriptionCancelledEmail } from "@/lib/email/templates";
```

- [ ] **Step 2: Refactor the `invoice.payment_failed` handling**

In the section that uses `getSubscriptionStatusFromEvent`, the status `past_due` maps to `invoice.payment_failed`. After the existing `prisma.user.updateMany` call for `past_due`, we need to find the user and send an email. Replace the existing `updateMany` block (around lines 80-129) with a pattern that uses `findFirst` + `update` when we need the email.

Specifically, after the existing status update logic for `past_due` and `cancelled`, add email sends. The cleanest approach: after the `updateMany`, do a `findFirst` to get the user's email when the status is `past_due` or `cancelled`:

After the existing `await prisma.user.updateMany(...)` block but before the final `return`, add:

```typescript
// Send transactional emails for payment failure and cancellation.
// Note: user may not exist if account was just deleted (which cancels
// Stripe subscriptions, triggering this webhook). findFirst handles
// this gracefully — if null, we skip the email.
if (status === "past_due" || status === "cancelled") {
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { email: true },
  });

  if (user) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";

    try {
      if (status === "past_due") {
        const { subject, html } = buildPaymentFailedEmail({
          settingsUrl: `${appUrl}/settings`,
        });
        await sendEmail({ to: user.email, subject, html });
      } else if (status === "cancelled") {
        const { subject, html } = buildSubscriptionCancelledEmail({
          choosePlanUrl: `${appUrl}/choose-plan`,
        });
        await sendEmail({ to: user.email, subject, html });
      }
    } catch {
      // Email failure shouldn't break the webhook
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: send payment failed and subscription cancelled emails from webhook"
```

---

## Task 10: Wire up welcome email after verification

**Files:**

- Modify: `src/app/api/auth/verify-email/route.ts`

- [ ] **Step 1: Add imports**

Add to imports:

```typescript
import { sendEmail } from "@/lib/email/client";
import { buildWelcomeEmail } from "@/lib/email/templates";
```

- [ ] **Step 2: Send welcome email after successful verification**

After the `$transaction` block (line 51) but before the success return, add:

```typescript
// Send welcome email
try {
  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { name: true, email: true },
  });
  if (user) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
    const { subject, html } = buildWelcomeEmail({
      userName: user.name,
      dashboardUrl: `${appUrl}/dashboard`,
    });
    await sendEmail({ to: user.email, subject, html });
  }
} catch {
  // Welcome email failure shouldn't block verification
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/verify-email/route.ts
git commit -m "feat: send welcome email after email verification"
```

---

## Task 11: Wire up account deletion email

**Files:**

- Modify: `src/app/api/account/delete/route.ts`

- [ ] **Step 1: Add imports**

Add to imports:

```typescript
import { sendEmail } from "@/lib/email/client";
import { buildAccountDeletedEmail } from "@/lib/email/templates";
```

- [ ] **Step 2: Send deletion email before deleting data**

After the user fetch (line 19) but before the Stripe cancellation (line 26), add:

```typescript
// Send deletion confirmation while we still have the email
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
try {
  const { subject, html } = buildAccountDeletedEmail({
    contactUrl: `${appUrl}/contact`,
  });
  await sendEmail({ to: user.email, subject, html });
} catch {
  // Email failure shouldn't block deletion
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/account/delete/route.ts
git commit -m "feat: send account deletion confirmation email"
```

---

## Task 12: Update profile route to accept `remindersMuted`

**Files:**

- Modify: `src/app/api/account/update-profile/route.ts`

- [ ] **Step 1: Update validation to support partial updates**

The current route requires `name` and `email`. We need to allow `remindersMuted`-only updates. Replace the validation and body destructuring at lines 15-24:

```typescript
const body = await req.json();
const { name, email, remindersMuted } = body;

// Handle remindersMuted-only update
if (remindersMuted !== undefined && name === undefined && email === undefined) {
  if (typeof remindersMuted !== "boolean") {
    return NextResponse.json({ error: "remindersMuted must be a boolean" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { remindersMuted },
  });
  return NextResponse.json({ success: true });
}

// Full profile update — name and email required
if (!name || typeof name !== "string" || name.trim().length === 0) {
  return NextResponse.json({ error: "Name is required" }, { status: 400 });
}

if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
}
```

Then in the existing `prisma.user.update` for name (line 30-33), include `remindersMuted` if present:

```typescript
await prisma.user.update({
  where: { id: session.user.id },
  data: {
    name: trimmedName,
    ...(typeof remindersMuted === "boolean" ? { remindersMuted } : {}),
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/account/update-profile/route.ts
git commit -m "feat: accept remindersMuted in profile update route"
```

---

## Task 13: Add reminder toggle to settings page

**Files:**

- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/components/settings-actions.tsx`

- [ ] **Step 1: Pass `remindersMuted` from settings page to SettingsActions**

In `src/app/(app)/settings/page.tsx`, update the `SettingsActions` component call to include the new prop:

```tsx
<SettingsActions
  hasSubscription={user.subscriptionStatus !== "none"}
  hasStripeCustomer={!!user.stripeCustomerId}
  isAgentTier={user.subscriptionTier === "agent"}
  filingAsAgent={user.filingAsAgent}
  remindersMuted={user.remindersMuted}
  companies={user.companies.map((c) => ({ id: c.id, name: c.companyName }))}
/>
```

- [ ] **Step 2: Add the reminder toggle to `SettingsActions`**

In `src/components/settings-actions.tsx`, add `remindersMuted: boolean` to the component's props interface and add a Notifications section. Read the file first to understand the existing structure, then add a notifications card section before the danger zone. The toggle should:

- Show "Reminder emails" label with description "Receive email reminders when filing deadlines are approaching"
- Use a checkbox or toggle input
- Call `PATCH /api/account/update-profile` with `{ remindersMuted: !current }` on change
- Show current state (on/off)
- Follow the existing card/section styling pattern in the file

- [ ] **Step 3: Handle the `?reminders=muted` query param for success feedback**

If the settings page URL contains `?reminders=muted` (from the mute link redirect), show a brief success message. This can be handled in the settings page or the SettingsActions component as a dismissable banner.

- [ ] **Step 4: Run the dev server and verify the toggle works**

```bash
npm run dev
```

Navigate to `/settings`, verify the toggle appears, click it, and confirm it persists.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/settings/page.tsx src/components/settings-actions.tsx
git commit -m "feat: add reminder email toggle to settings page"
```

---

## Task 14: Final integration test

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All pass.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any remaining fixes**

If any test/lint/build issues were found and fixed, commit them.

```bash
git add -A
git commit -m "fix: address lint and build issues from email template redesign"
```
