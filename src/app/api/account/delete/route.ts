import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { sendEmail } from "@/lib/email/client";
import { buildAccountDeletedEmail } from "@/lib/email/templates";

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      companies: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Snapshot the data we need to send the confirmation email — the user
  // row will be gone by the time we send.
  const userEmail = user.email;
  const userId = user.id;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";

  // Cancel all Stripe subscriptions and delete the customer
  if (user.stripeCustomerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
    });

    for (const sub of subscriptions.data) {
      if (sub.status !== "canceled") {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    await stripe.customers.del(user.stripeCustomerId);
  }

  // Delete in order: notifications → filings → companies → user.
  // After this block, any concurrent duplicate invocation will fall through
  // to findUnique → null → 404 and never reach the email send below.
  for (const company of user.companies) {
    await prisma.notification.deleteMany({
      where: { companyId: company.id },
    });

    await prisma.filing.deleteMany({
      where: { companyId: company.id },
    });

    await prisma.company.delete({
      where: { id: company.id },
    });
  }

  await prisma.user.delete({
    where: { id: user.id },
  });

  // Send deletion confirmation last. Idempotency key dedupes at Resend in
  // case both invocations somehow reach this point within ~24h.
  try {
    const { subject, html } = buildAccountDeletedEmail({
      contactUrl: `${appUrl}/contact`,
    });
    await sendEmail({
      to: userEmail,
      subject,
      html,
      idempotencyKey: `account-deleted-${userId}`,
    });
  } catch {
    // Email failure shouldn't block deletion
  }

  // Clear the NextAuth session cookie server-side so the user is logged out
  // even if the client-side signOut flow is interrupted (navigation, error).
  const response = NextResponse.json({ deleted: true });
  for (const name of ["next-auth.session-token", "__Secure-next-auth.session-token"]) {
    response.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: name.startsWith("__Secure-"),
    });
  }
  return response;
}
