import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DormantFile - Dormant Company Filing Made Simple",
  description:
    "File your dormant company accounts and nil CT600 tax returns online. Direct submission to Companies House and HMRC.",
  other: {
    "theme-color": "#ffffff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
        <GoogleAnalytics />
        <CookieConsent />
      </body>
    </html>
  );
}
