import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import {
  buildAdminSignupEmail,
  buildAdminTierChangeEmail,
  buildAdminPaymentSucceededEmail,
  buildAdminPaymentFailedEmail,
  buildAdminSubscriptionCancelledEmail,
} from "@/lib/email/templates";
import type { SubscriptionTier } from "@prisma/client";

interface UserContext {
  userEmail: string;
  userName: string;
}

export type AdminEvent =
  | ({ kind: "signup" } & UserContext)
  | ({
      kind: "tier_change";
      fromTier: SubscriptionTier;
      toTier: SubscriptionTier;
      direction: "upgrade" | "downgrade";
    } & UserContext)
  | ({
      kind: "payment_succeeded";
      amountPence: number;
      currency: string;
      tier: SubscriptionTier;
      isFirstPayment: boolean;
    } & UserContext)
  | ({ kind: "payment_failed"; tier: SubscriptionTier } & UserContext)
  | ({ kind: "subscription_cancelled"; previousTier: SubscriptionTier } & UserContext);

function buildTemplate(event: AdminEvent): { subject: string; html: string } {
  switch (event.kind) {
    case "signup":
      return buildAdminSignupEmail(event);
    case "tier_change":
      return buildAdminTierChangeEmail(event);
    case "payment_succeeded":
      return buildAdminPaymentSucceededEmail(event);
    case "payment_failed":
      return buildAdminPaymentFailedEmail(event);
    case "subscription_cancelled":
      return buildAdminSubscriptionCancelledEmail(event);
  }
}

/**
 * Sends a notification email about `event` to every admin user.
 * Fire-and-forget: per-send failures are logged, never thrown.
 * Silent no-op when no admins exist.
 */
export async function notifyAdmins(event: AdminEvent): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { email: true },
  });

  if (admins.length === 0) return;

  const { subject, html } = buildTemplate(event);

  await Promise.all(
    admins.map(async (admin) => {
      try {
        await sendEmail({ to: admin.email, subject, html });
      } catch (err) {
        console.error(`Admin notification (${event.kind}) failed for ${admin.email}:`, err);
      }
    }),
  );
}
