interface AuthErrorProps {
  message: string | null;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="text-sm rounded-lg px-4 py-2.5"
      style={{
        color: "var(--color-danger-text)",
        backgroundColor: "var(--color-danger-bg)",
        borderWidth: "1px",
        borderColor: "var(--color-danger-border)",
      }}
    >
      {message}
    </p>
  );
}
