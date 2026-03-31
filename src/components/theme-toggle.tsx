"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

const CYCLE: Array<"system" | "light" | "dark"> = ["system", "light", "dark"];

const LABELS: Record<string, string> = {
  system: "Using system theme",
  light: "Switch to dark mode",
  dark: "Switch to system theme",
};

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  function handleClick() {
    const currentIndex = CYCLE.indexOf(theme as "system" | "light" | "dark");
    const next = CYCLE[(currentIndex + 1) % CYCLE.length];
    setTheme(next);
  }

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      onClick={handleClick}
      aria-label={LABELS[theme ?? "system"]}
      title={LABELS[theme ?? "system"]}
      className="focus-ring flex items-center justify-center w-8 h-8 rounded-lg text-secondary bg-transparent border-0 cursor-pointer transition-colors duration-200"
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  );
}
