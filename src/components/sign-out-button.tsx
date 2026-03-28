"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Sign out"
      aria-label="Sign out"
      className="focus-ring"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        color: "#64748B",
        backgroundColor: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "color 200ms, background-color 200ms",
      }}
    >
      <LogOut size={18} strokeWidth={2} />
    </button>
  );
}
