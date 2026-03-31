import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const { rating, text, name } = body;

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  if (text && typeof text !== "string") {
    return NextResponse.json({ error: "Invalid text." }, { status: 400 });
  }

  // Authenticated user flow
  if (session?.user?.id) {
    const existingReview = await prisma.review.findUnique({
      where: { userId: session.user.id },
    });

    if (existingReview) {
      return NextResponse.json({ error: "You have already submitted a review." }, { status: 409 });
    }

    // Check the user has at least one accepted filing
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        companies: {
          include: {
            filings: {
              where: { status: "accepted" },
              take: 1,
            },
          },
        },
      },
    });

    const hasAcceptedFiling = user?.companies.some((c) => c.filings.length > 0);

    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        rating,
        text: text || null,
        name: user?.name ?? "Anonymous",
        verified: !!hasAcceptedFiling,
        approved: true,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  }

  // Public visitor flow
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      rating,
      text: text || null,
      name: name.trim(),
      verified: false,
      approved: false,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { rating, text } = body;

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const existingReview = await prisma.review.findUnique({
    where: { userId: session.user.id },
  });

  if (!existingReview) {
    return NextResponse.json({ error: "No review found to update." }, { status: 404 });
  }

  const review = await prisma.review.update({
    where: { userId: session.user.id },
    data: {
      rating,
      text: text || null,
    },
  });

  return NextResponse.json({ review });
}
