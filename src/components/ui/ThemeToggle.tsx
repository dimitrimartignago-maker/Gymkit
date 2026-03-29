"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
      className={[
        "flex items-center justify-center w-9 h-9 rounded-md transition-colors",
        "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-overlay-md)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
