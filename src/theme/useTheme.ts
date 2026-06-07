"use client";

import { useContext } from "react";

import { ThemeContext, type ThemeContextValue } from "./ThemeProvider";

/**
 * Access the current theme and theme controls.
 *
 * @example
 * const { theme, toggleTheme, setTheme } = useTheme();
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

export { currentTheme } from "./theme-init";
