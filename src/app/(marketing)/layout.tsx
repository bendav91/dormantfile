import { IBM_Plex_Sans } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={ibmPlexSans.className}
      style={{
        backgroundColor: "var(--color-bg-page)",
        color: "var(--color-text-primary)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteNav variant="marketing" />
      <main id="main-content" className="px-6 py-10 flex-1">
        <div className="max-w-[960px] mx-auto">{children}</div>
      </main>
      <SiteFooter variant="marketing" />
    </div>
  );
}
