"use client";

import { useSyncExternalStore } from "react";

function subscribeCookieConsent(cb: () => void) {
  window.addEventListener("consent-updated", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("consent-updated", cb);
    window.removeEventListener("storage", cb);
  };
}

export function CookieConsent() {
  const stored = useSyncExternalStore(
    subscribeCookieConsent,
    () => localStorage.getItem("cookie-consent"),
    () => "pending" // SSR: assume pending so it renders nothing server-side
  );
  const visible = stored === null;

  function respond(accepted: boolean) {
    localStorage.setItem("cookie-consent", accepted ? "accepted" : "declined");
    window.dispatchEvent(new Event("consent-updated"));
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:px-8">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        We use cookies for analytics to help improve our service.{" "}
        <a href="/cookies" className="underline hover:text-gray-900 dark:hover:text-gray-100">
          Learn more
        </a>
      </p>
      <div className="mt-3 flex gap-3 sm:mt-0 sm:shrink-0">
        <button
          onClick={() => respond(false)}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
        >
          Decline
        </button>
        <button
          onClick={() => respond(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
