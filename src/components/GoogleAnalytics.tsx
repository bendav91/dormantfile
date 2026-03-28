"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics as GA } from "@next/third-parties/google";

export function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    setConsented(localStorage.getItem("cookie-consent") === "accepted");

    const handler = () => {
      setConsented(localStorage.getItem("cookie-consent") === "accepted");
    };

    window.addEventListener("consent-updated", handler);
    return () => window.removeEventListener("consent-updated", handler);
  }, []);

  if (!consented || !gaId) return null;

  return <GA gaId={gaId} />;
}
