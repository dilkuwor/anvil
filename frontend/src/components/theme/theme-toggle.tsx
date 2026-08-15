"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground"
    >
      <Moon className="hidden h-4 w-4 dark:block" aria-hidden />
      <Sun className="h-4 w-4 dark:hidden" aria-hidden />
    </button>
  );
}
