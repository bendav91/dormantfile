function formatUKDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #1a1a1a;">${c.companyName}</strong><br>
              <span style="color: #666; font-size: 13px;">Deadline: ${deadlineStr} (${timing})</span>
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: middle;">
              <a href="${c.fileUrl}" style="color: #2563eb; font-weight: 600; text-decoration: none; font-size: 13px;">File now</a>
            </td>
          </tr>`;
        })
        .join("");

      return `<div style="margin-bottom: 28px;">
        <h2 style="color: ${section.isOverdue ? "#dc2626" : "#1a1a1a"}; font-size: 16px; margin: 0 0 10px 0;">
          ${section.heading} (${pluralise(section.companies.length, "company", "companies")})
        </h2>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
          ${rowsHtml}
        </table>
      </div>`;
    })
    .join("");

  const penaltyNote = hasOverdue
    ? "Companies House imposes a &pound;150 penalty for late accounts, rising to &pound;375 after 1 month, &pound;750 after 3 months, and &pound;1,500 after 6 months."
    : "Companies House imposes a &pound;150 penalty if accounts are filed late, rising to &pound;750 after 3 months.";

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a1a1a; font-size: 22px;">Filing ${hasOverdue ? "Action Required" : "Reminders"}</h1>
    <p>Hi ${userName},</p>
    <p>Here's a summary of your companies that need filing attention:</p>
    ${sectionsHtml}
    <p style="color: #666; font-size: 14px;">
      <strong>Note:</strong> ${penaltyNote}
    </p>
    <p style="margin-top: 24px;">
      <a
        href="${dashboardUrl}"
        style="
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        "
      >
        View Dashboard
      </a>
    </p>
  </body>
</html>
`.trim();

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

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a1a1a;">${filingLabel} Filed Successfully</h1>
    <p>
      The ${filingLabel} for <strong>${companyName}</strong> has
      been successfully filed with ${authority}.
    </p>
    <p>
      <strong>Accounting period:</strong> ${startFormatted} to ${endFormatted}
    </p>
    <p style="color: #666; font-size: 14px;">
      If you have additional outstanding periods, they are available on your
      dashboard. You will receive a reminder when the next filing deadline is
      approaching.
    </p>
  </body>
</html>
`.trim();

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

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <h1 style="color: #1a1a1a;">Verify your email address</h1>
    <p>
      Thanks for registering with DormantFile. Click the button below to verify
      your email address and activate your account.
    </p>
    <p>
      <a
        href="${verifyUrl}"
        style="
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        "
      >
        Verify Email Address
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      This link expires in <strong>24 hours</strong>. If you did not create a
      DormantFile account, you can safely ignore this email.
    </p>
  </body>
</html>
`.trim();

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

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <h1 style="color: #1a1a1a;">Confirm your new email address</h1>
    <p>
      We received a request to change the email address on your DormantFile
      account to <strong>${newEmail}</strong>. Click the button below to confirm
      this change.
    </p>
    <p>
      <a
        href="${verifyUrl}"
        style="
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        "
      >
        Confirm New Email Address
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      This link expires in <strong>24 hours</strong>. If you did not request
      this change, you can safely ignore this email.
    </p>
  </body>
</html>
`.trim();

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

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <h1 style="color: #1a1a1a;">Email change requested</h1>
    <p>
      A request was made to change the email address on your DormantFile account
      to <strong>${newEmail}</strong>.
    </p>
    <p>
      A confirmation link has been sent to the new address. The change will only
      take effect once confirmed.
    </p>
    <p style="color: #666; font-size: 14px;">
      If you did not make this request, please secure your account immediately
      by resetting your password.
    </p>
  </body>
</html>
`.trim();

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

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a1a1a;">Reset your password</h1>
    <p>
      We received a request to reset the password for your DormantFile account.
      Click the button below to set a new password.
    </p>
    <p>
      <a
        href="${resetUrl}"
        style="
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        "
      >
        Reset Password
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      This link expires in <strong>1 hour</strong>. If you did not request a
      password reset, you can safely ignore this email.
    </p>
  </body>
</html>
`.trim();

  return { subject, html };
}
