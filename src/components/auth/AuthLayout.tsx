import Link from "next/link";
import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--color-bg-page)" }}
    >
      <Link href="/" className="mb-8 focus-ring rounded" aria-label="DormantFile home">
        <Logo height={28} />
      </Link>

      <div
        className="w-full max-w-[420px] rounded-xl px-6 py-8 sm:px-10 sm:py-10"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.03)",
        }}
      >
        {children}
      </div>
    </main>
  );
}
