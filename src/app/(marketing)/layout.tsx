import { IBM_Plex_Sans } from "next/font/google";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={ibmPlexSans.className}
      style={{ backgroundColor: "#F8FAFC", color: "#1E293B", minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <MarketingNav />
      <main
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
      <MarketingFooter />
    </div>
  );
}
