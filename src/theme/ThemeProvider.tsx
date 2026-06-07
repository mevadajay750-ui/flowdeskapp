"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { THEME_STORAGE_KEY } from "./constants";
import { applyTheme, getCurrentThemeFromDOM } from "./theme-init";
import type { Theme } from "./types";

export interface ThemeContextValue {
  /** Current active theme */
  theme: Theme;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Set a specific theme */
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      return getCurrentThemeFromDOM();
    }
    return "light";
  });

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  useEffect(() => {
    const domTheme = getCurrentThemeFromDOM();
    if (domTheme !== theme) {
      setThemeState(domTheme);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && event.newValue) {
        const stored = event.newValue;
        if (stored === "light" || stored === "dark") {
          document.documentElement.setAttribute("data-theme", stored);
          document.documentElement.style.colorScheme = stored;
          setThemeState(stored);
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
