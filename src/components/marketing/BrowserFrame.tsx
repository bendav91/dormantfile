export function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-inset">
        {/* Traffic light dots */}
        <div className="flex gap-1.5 shrink-0">
          <span className="block w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="block w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="block w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>

        {/* URL bar */}
        <div className="flex-1 text-center text-xs text-muted font-mono tracking-[0.01em]">
          dormantfile.co.uk/dashboard
        </div>

        {/* Spacer to balance the dots */}
        <div className="w-[44px] shrink-0" />
      </div>

      {/* Content area */}
      <div className="p-6">{children}</div>
    </div>
  );
}
