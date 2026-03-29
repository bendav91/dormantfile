import { isPreviewMode } from "@/lib/launch-mode";

interface LaunchBannerProps {
  variant: "marketing" | "app";
}

const COPY = {
  marketing: "We're launching soon — sign up now to be ready when filing goes live.",
  app: "Filing is coming soon — we'll let you know when it's live.",
};

export function LaunchBanner({ variant }: LaunchBannerProps) {
  if (!isPreviewMode) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--color-primary)",
        color: "var(--color-bg-card)",
        textAlign: "center",
        padding: "10px 16px",
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      {COPY[variant]}
    </div>
  );
}
