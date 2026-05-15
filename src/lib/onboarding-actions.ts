"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function dismissOnboarding(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingDismissedAt: new Date() },
  });
  revalidatePath("/dashboard");
}
