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

export function buildReminderEmail(data: ReminderEmailData): ReminderEmailResult {
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
