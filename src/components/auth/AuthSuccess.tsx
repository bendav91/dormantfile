interface AuthSuccessProps {
  message: string | null;
}

export function AuthSuccess({ message }: AuthSuccessProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 text-sm rounded-lg px-4 py-3 text-success-text bg-success-bg border border-success-border"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 mt-0.5"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
