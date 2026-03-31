import { IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function NotFoundPage() {
  return (
    <div className={`${ibmPlexSans.className} min-h-screen bg-page flex flex-col items-center justify-center p-6`}>
      <FileQuestion size={48} className="text-[var(--color-bg-disabled)]" strokeWidth={1.5} />
      <h1 className="text-[72px] font-bold text-foreground mt-6 tracking-[-0.03em] leading-none">
        404
      </h1>
      <p className="text-lg text-secondary mt-3 text-center">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="focus-ring mt-8 bg-primary text-card px-6 py-3 rounded-lg font-semibold text-sm no-underline transition-colors duration-200"
      >
        Go home
      </Link>
    </div>
  );
}
