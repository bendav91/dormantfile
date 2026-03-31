"use client";

import { AlertTriangle } from "lucide-react";
import { IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={`${ibmPlexSans.className} min-h-screen bg-page flex flex-col items-center justify-center p-6`}>
      <AlertTriangle size={48} className="text-cta" strokeWidth={1.5} />
      <h1 className="text-[28px] font-bold text-foreground mt-6 tracking-[-0.02em]">
        Something went wrong
      </h1>
      <p className="text-base text-secondary mt-2 text-center max-w-[400px]">
        An unexpected error occurred. Please try again or return to the home page.
      </p>
      <div className="flex gap-3 mt-8">
        <button
          onClick={reset}
          className="focus-ring bg-primary text-card px-6 py-3 rounded-lg font-semibold text-sm border-0 cursor-pointer transition-colors duration-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="focus-ring bg-transparent text-primary px-6 py-3 rounded-lg font-semibold text-sm border-2 border-primary no-underline transition-colors duration-200"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
