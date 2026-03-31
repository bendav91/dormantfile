import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { IBM_Plex_Sans } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.emailVerified) {
    redirect("/verify-email");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  const isAdmin = user?.isAdmin ?? false;

  return (
    <div
      className={`${ibmPlexSans.variable} min-h-screen`}
      style={{
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        backgroundColor: "var(--color-bg-page)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteNav variant="app" user={{ email: session.user.email! }} isAdmin={isAdmin} />

      <main id="main-content" className="px-6 py-10 flex-1">
        <div className="max-w-[960px] mx-auto">{children}</div>
      </main>

      <SiteFooter variant="app" />
    </div>
  );
}
