import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IBM_Plex_Sans } from "next/font/google";
import { AuthLayout } from "@/components/auth";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

export default async function AuthRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect(session.user.emailVerified ? "/dashboard" : "/verify-email");
  }

  return (
    <div
      className={ibmPlexSans.variable}
      style={{ fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}
    >
      <AuthLayout>{children}</AuthLayout>
    </div>
  );
}
