import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { SubscriptionTier } from "@prisma/client";
import { priceIdFromTier } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Determine tier from request body, default to "basic"
  let tier: SubscriptionTier = "basic";
  try {
    const body = await req.json();
    if (body.tier && ["basic", "multi", "bulk"].includes(body.tier)) {
      tier = body.tier as SubscriptionTier;
    }
  } catch {
    // No body or invalid JSON — default to basic
  }

  const priceId = priceIdFromTier(tier);
  if (!priceId) {
    return NextResponse.json({ error: "Plan not available" }, { status: 400 });
  }

  let stripeCustomerId = user.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
    });

    stripeCustomerId = customer.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: { tier },
    success_url: `${process.env.NEXTAUTH_URL}/dashboard`,
    cancel_url: `${process.env.NEXTAUTH_URL}/choose-plan`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
