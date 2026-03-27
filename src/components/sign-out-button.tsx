"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Sign out"
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
        transition: "all 200ms",
      }}
    >
      <LogOut size={18} strokeWidth={2} />
    </button>
  );
}
