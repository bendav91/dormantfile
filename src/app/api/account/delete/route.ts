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

  // Send deletion confirmation while we still have the email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
  try {
    const { subject, html } = buildAccountDeletedEmail({
      contactUrl: `${appUrl}/contact`,
    });
    await sendEmail({ to: user.email, subject, html });
  } catch {
    // Email failure shouldn't block deletion
  }

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

  // Delete in order: notifications → filings → companies → user
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

  return NextResponse.json({ deleted: true });
}
