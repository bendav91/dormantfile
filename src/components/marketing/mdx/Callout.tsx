export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 p-5 bg-primary-bg rounded-lg border border-primary-border">
      <div className="text-[15px] leading-[1.7] text-body">
        {children}
      </div>
    </div>
  );
}
