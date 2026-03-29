export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-12"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-md rounded-xl p-8">
        {children}
      </div>
    </main>
  );
}
