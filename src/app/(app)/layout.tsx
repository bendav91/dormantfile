import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
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
      <SiteNav variant="app" user={{ email: session.user.email! }} />

      <main
        id="main-content"
        style={{
          maxWidth: "960px",
          width: "100%",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
          flex: 1,
        }}
      >
        {children}
      </main>

      <SiteFooter variant="app" />
    </div>
  );
}
