import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IBM_Plex_Sans } from "next/font/google";
import { Settings } from "lucide-react";
import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";
import { Logo } from "@/components/Logo";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className={`${ibmPlexSans.variable} min-h-screen bg-[#F8FAFC]`} style={{ fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>
      <nav
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <Logo size={22} />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#1E293B",
                letterSpacing: "-0.01em",
              }}
            >
              DormantFile
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                fontSize: "14px",
                color: "#64748B",
                fontWeight: 500,
              }}
            >
              {session.user.email}
            </span>
            <Link
              href="/settings"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                color: "#64748B",
                transition: "color 200ms, background-color 200ms",
              }}
              title="Account settings"
              aria-label="Account settings"
              className="focus-ring"
            >
              <Settings size={18} strokeWidth={2} />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>

      <main
        id="main-content"
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
