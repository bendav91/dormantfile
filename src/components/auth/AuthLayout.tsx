import Link from "next/link";
import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-page"
    >
      <Link href="/" className="mb-8 focus-ring rounded" aria-label="DormantFile home">
        <Logo height={28} />
      </Link>

      <div className="w-full max-w-[420px] rounded-xl px-6 py-8 sm:px-10 sm:py-10 bg-card border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.03)]">
        {children}
      </div>
    </main>
  );
}
