import { IBM_Plex_Sans } from "next/font/google";
import { AuthLayout } from "@/components/auth";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${ibmPlexSans.variable} font-[family-name:var(--font-ibm-plex-sans),sans-serif]`}>
      <AuthLayout>{children}</AuthLayout>
    </div>
  );
}
