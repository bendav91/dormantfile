"use client";

import { useSyncExternalStore } from "react";
import { GoogleAnalytics as GA } from "@next/third-parties/google";

function subscribeConsent(cb: () => void) {
  window.addEventListener("consent-updated", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("consent-updated", cb);
    window.removeEventListener("storage", cb);
  };
}

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const consented = useSyncExternalStore(
    subscribeConsent,
    () => localStorage.getItem("cookie-consent") === "accepted",
    () => false
  );

  if (!consented || !gaId) return null;

  return <GA gaId={gaId} />;
}
