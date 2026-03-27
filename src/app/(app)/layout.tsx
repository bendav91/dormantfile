import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IBM_Plex_Sans } from "next/font/google";
import { FileText } from "lucide-react";

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
            maxWidth: "56rem",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={22} color="#2563EB" strokeWidth={2} />
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
          </div>
          <span
            style={{
              fontSize: "14px",
              color: "#64748B",
              fontWeight: 500,
            }}
          >
            {session.user.email}
          </span>
        </div>
      </nav>

      <main
        style={{
          maxWidth: "56rem",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
