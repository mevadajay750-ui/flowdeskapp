"use client";

import { Moon, Sun } from "lucide-react";
import clsx from "clsx";

import { useTheme } from "@/theme/useTheme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={clsx(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-textSecondary shadow-sm",
        "transition-colors hover:bg-surface-secondary hover:text-textPrimary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "motion-reduce:transition-none",
        className
      )}
    >
      <span className="relative h-4 w-4">
        <Sun
          aria-hidden
          className={clsx(
            "absolute inset-0 h-4 w-4 transition-all duration-300 motion-reduce:transition-none",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0"
          )}
        />
        <Moon
          aria-hidden
          className={clsx(
            "absolute inset-0 h-4 w-4 transition-all duration-300 motion-reduce:transition-none",
            isDark
              ? "-rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          )}
        />
      </span>
    </button>
  );
}
