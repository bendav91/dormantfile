import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth";

export default async function AuthRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect(session.user.emailVerified ? "/dashboard" : "/verify-email");
  }

  return <AuthLayout>{children}</AuthLayout>;
}
