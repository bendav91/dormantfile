function formatUKDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface ReminderEmailData {
  companyName: string;
  daysUntilDeadline: number;
  filingDeadline: Date;
  fileUrl: string;
  filingType: "accounts" | "ct600";
}

interface ReminderEmailResult {
  subject: string;
  html: string;
}

export function buildReminderEmail(
  data: ReminderEmailData
): ReminderEmailResult {
  const { companyName, daysUntilDeadline, filingDeadline, fileUrl, filingType } = data;
  const deadlineFormatted = formatUKDate(filingDeadline);

  const isAccounts = filingType === "accounts";
  const filingLabel = isAccounts ? "Annual accounts" : "CT600";
  const authority = isAccounts ? "Companies House" : "HMRC";
  const penaltyNote = isAccounts
    ? "Companies House imposes a £150 penalty if accounts are filed late, rising to £750 after 3 months."
    : "HMRC imposes an initial penalty of £100 if your CT600 is filed late. Further penalties apply after 3 and 6 months.";

  const subject = `${filingLabel} filing reminder: ${companyName} - ${daysUntilDeadline} days left`;

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a1a1a;">${filingLabel} Filing Reminder</h1>
    <p>
      This is a reminder that <strong>${companyName}</strong> has a ${filingLabel} filing
      deadline of <strong>${deadlineFormatted}</strong>.
    </p>
    <p>
      You have <strong>${daysUntilDeadline} days</strong> remaining to file.
    </p>
    <p>
      <a
        href="${fileUrl}"
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
        File ${filingLabel} Now
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      <strong>Note:</strong> ${penaltyNote}
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
  data: FilingConfirmationEmailData
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

interface PasswordResetEmailData {
  resetUrl: string;
}

interface PasswordResetEmailResult {
  subject: string;
  html: string;
}

export function buildPasswordResetEmail(
  data: PasswordResetEmailData
): PasswordResetEmailResult {
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
