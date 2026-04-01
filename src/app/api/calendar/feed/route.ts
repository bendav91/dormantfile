import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

function formatDateStamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

function escapeIcalText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { calendarFeedToken: token },
  });

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: { userId: user.id, deletedAt: null },
    include: {
      filings: {
        where: { status: "outstanding", suppressedAt: null },
        orderBy: { periodEnd: "asc" },
      },
    },
  });

  const now = formatTimestamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DormantFile//Filing Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:DormantFile Deadlines",
  ];

  for (const company of companies) {
    for (const filing of company.filings) {
      const filingDeadline = filing.deadline ?? filing.accountsDeadline;
      const filingEndDate = (filing.endDate ?? filing.periodEnd).toISOString().split("T")[0];

      if (filing.filingType === "accounts" && filingDeadline) {
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${filing.id}-accounts@dormantfile.co.uk`);
        lines.push(`DTSTAMP:${now}`);
        lines.push(`DTSTART;VALUE=DATE:${formatDateStamp(filingDeadline)}`);
        lines.push(`SUMMARY:${escapeIcalText(`Accounts deadline: ${company.companyName}`)}`);
        lines.push(
          `DESCRIPTION:${escapeIcalText(`Annual accounts due for ${company.companyName} (${company.companyRegistrationNumber}). Period ending ${filingEndDate}.`)}`,
        );
        lines.push("END:VEVENT");
      }

      if (filing.filingType === "ct600" && filingDeadline) {
        const ct600Deadline = filing.deadline ?? filing.ct600Deadline;
        if (ct600Deadline) {
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:${filing.id}-ct600@dormantfile.co.uk`);
          lines.push(`DTSTAMP:${now}`);
          lines.push(`DTSTART;VALUE=DATE:${formatDateStamp(ct600Deadline)}`);
          lines.push(`SUMMARY:${escapeIcalText(`CT600 deadline: ${company.companyName}`)}`);
          lines.push(
            `DESCRIPTION:${escapeIcalText(`Corporation Tax return due for ${company.companyName} (${company.companyRegistrationNumber}). Period ending ${filingEndDate}.`)}`,
          );
          lines.push("END:VEVENT");
        }
      }
    }
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="dormantfile.ics"',
      "Cache-Control": "no-cache, no-store",
    },
  });
}
