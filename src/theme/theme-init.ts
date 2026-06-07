import { THEME_STORAGE_KEY } from "./constants";
import type { Theme } from "./types";

/** Returns the resolved theme from localStorage or system preference. */
export function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Applies theme to the document root and persists to localStorage. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

/** Reads the current theme from the DOM (set by init script or provider). */
export function getCurrentThemeFromDOM(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

/** Returns the currently applied theme from the document root. */
export function currentTheme(): Theme {
  return getCurrentThemeFromDOM();
}

/**
 * Inline script injected in <head> before hydration to prevent theme FOUC.
 * Must stay in sync with getInitialTheme() / applyTheme() logic.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
