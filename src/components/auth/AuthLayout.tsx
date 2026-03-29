interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main id="main-content" className="min-h-screen md:grid md:grid-cols-2">
      {children}
    </main>
  );
}
