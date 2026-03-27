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
}

interface ReminderEmailResult {
  subject: string;
  html: string;
}

export function buildReminderEmail(
  data: ReminderEmailData
): ReminderEmailResult {
  const { companyName, daysUntilDeadline, filingDeadline, fileUrl } = data;
  const deadlineFormatted = formatUKDate(filingDeadline);

  const subject = `CT600 filing reminder: ${companyName} - ${daysUntilDeadline} days left`;

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a1a1a;">CT600 Filing Reminder</h1>
    <p>
      This is a reminder that <strong>${companyName}</strong> has a CT600 filing
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
        File CT600 Now
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      <strong>Note:</strong> HMRC imposes an initial penalty of £100 if your
      CT600 is filed late. Further penalties apply after 3 and 6 months.
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
}

interface FilingConfirmationEmailResult {
  subject: string;
  html: string;
}

export function buildFilingConfirmationEmail(
  data: FilingConfirmationEmailData
): FilingConfirmationEmailResult {
  const { companyName, periodStart, periodEnd } = data;
  const startFormatted = formatUKDate(periodStart);
  const endFormatted = formatUKDate(periodEnd);

  const subject = `CT600 filed successfully: ${companyName}`;

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a1a1a;">CT600 Filed Successfully</h1>
    <p>
      The CT600 Corporation Tax return for <strong>${companyName}</strong> has
      been successfully filed with HMRC.
    </p>
    <p>
      <strong>Accounting period:</strong> ${startFormatted} to ${endFormatted}
    </p>
    <p style="color: #666; font-size: 14px;">
      Your next accounting period has been set up automatically. You will receive
      a reminder when the next filing deadline is approaching.
    </p>
  </body>
</html>
`.trim();

  return { subject, html };
}
