"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Sign out"
      aria-label="Sign out"
      className="focus-ring flex items-center justify-center w-8 h-8 rounded-lg text-secondary bg-transparent border-0 cursor-pointer transition-colors duration-200"
    >
      <LogOut size={18} strokeWidth={2} />
    </button>
  );
}
