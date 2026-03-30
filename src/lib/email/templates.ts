function formatUKDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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
                © ${year} dormantfile.co.uk
                <br>
                ${false && '<span style="color:#c0c5cc;">Company address placeholder</span>'}
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

export interface ReminderCompany {
  companyName: string;
  deadline: Date;
  daysUntilDeadline: number;
  fileUrl: string;
}

export interface ReminderSection {
  heading: string;
  isOverdue: boolean;
  companies: ReminderCompany[];
}

interface ReminderEmailData {
  userName: string;
  dashboardUrl: string;
  sections: ReminderSection[];
  unsubscribeUrl?: string;
}

interface ReminderEmailResult {
  subject: string;
  html: string;
}

function pluralise(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + "s")}`;
}

export function buildReminderEmail(data: ReminderEmailData): ReminderEmailResult {
  const { userName, dashboardUrl, sections } = data;
  const hasOverdue = sections.some((s) => s.isOverdue);
  const totalCompanies = sections.reduce((sum, s) => sum + s.companies.length, 0);

  const subject = hasOverdue
    ? "Action required: You have overdue company filings"
    : `Filing reminder: ${pluralise(totalCompanies, "company", "companies")} ${totalCompanies === 1 ? "needs" : "need"} attention`;

  const sectionsHtml = sections
    .map((section) => {
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
    })
    .join("");

  const penaltyNote = hasOverdue
    ? "Companies House imposes a &pound;150 penalty for late accounts, rising to &pound;375 after 1 month, &pound;750 after 3 months, and &pound;1,500 after 6 months."
    : "Companies House imposes a &pound;150 penalty if accounts are filed late, rising to &pound;750 after 3 months.";

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

  return { subject, html };
}

interface FilingConfirmationEmailData {
  companyName: string;
  periodStart: Date;
  periodEnd: Date;
  filingType: "accounts" | "ct600";
}

interface FilingConfirmationEmailResult {
  subject: string;
  html: string;
}

export function buildFilingConfirmationEmail(
  data: FilingConfirmationEmailData,
): FilingConfirmationEmailResult {
  const { companyName, periodStart, periodEnd, filingType } = data;
  const startFormatted = formatUKDate(periodStart);
  const endFormatted = formatUKDate(periodEnd);

  const isAccounts = filingType === "accounts";
  const filingLabel = isAccounts ? "Annual accounts" : "CT600";
  const authority = isAccounts ? "Companies House" : "HMRC";

  const subject = `${filingLabel} filed successfully: ${companyName}`;

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

  return { subject, html };
}

interface VerificationEmailData {
  verifyUrl: string;
}

interface VerificationEmailResult {
  subject: string;
  html: string;
}

export function buildVerificationEmail(data: VerificationEmailData): VerificationEmailResult {
  const { verifyUrl } = data;

  const subject = "Verify your email address";

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

  return { subject, html };
}

interface EmailChangeEmailData {
  verifyUrl: string;
  newEmail: string;
}

interface EmailChangeEmailResult {
  subject: string;
  html: string;
}

export function buildEmailChangeEmail(data: EmailChangeEmailData): EmailChangeEmailResult {
  const { verifyUrl, newEmail } = data;

  const subject = "Confirm your new email address";

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

  return { subject, html };
}

interface EmailChangeNotificationEmailData {
  newEmail: string;
}

interface EmailChangeNotificationEmailResult {
  subject: string;
  html: string;
}

export function buildEmailChangeNotificationEmail(
  data: EmailChangeNotificationEmailData,
): EmailChangeNotificationEmailResult {
  const { newEmail } = data;

  const subject = "Email change requested on your DormantFile account";

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

  return { subject, html };
}

interface PasswordResetEmailData {
  resetUrl: string;
}

interface PasswordResetEmailResult {
  subject: string;
  html: string;
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): PasswordResetEmailResult {
  const { resetUrl } = data;

  const subject = "Reset your DormantFile password";

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

  return { subject, html };
}

interface WelcomeEmailData {
  userName: string;
  dashboardUrl: string;
}

interface WelcomeEmailResult {
  subject: string;
  html: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData): WelcomeEmailResult {
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

interface PaymentFailedEmailResult {
  subject: string;
  html: string;
}

export function buildPaymentFailedEmail(data: PaymentFailedEmailData): PaymentFailedEmailResult {
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

interface SubscriptionCancelledEmailResult {
  subject: string;
  html: string;
}

export function buildSubscriptionCancelledEmail(
  data: SubscriptionCancelledEmailData,
): SubscriptionCancelledEmailResult {
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

interface AccountDeletedEmailResult {
  subject: string;
  html: string;
}

export function buildAccountDeletedEmail(data: AccountDeletedEmailData): AccountDeletedEmailResult {
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
