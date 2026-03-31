"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print bg-cta text-card py-3 px-6 rounded-lg font-semibold text-sm border-0 cursor-pointer transition-all duration-200 w-full mt-6"
    >
      Print receipt
    </button>
  );
}
