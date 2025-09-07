"use client";
import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "ui.theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? getSystemTheme();
  });

  // Persist and apply attribute for theming
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // React to system theme changes if user hasn't manually set a preference
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!m) return;
    const onChange = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (!stored) setThemeState(getSystemTheme());
    };
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (t) => setThemeState(t),
      toggle: () => setThemeState((t) => (t === "light" ? "dark" : "light")),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggleButton() {
  const { toggle, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const title = mounted
    ? `Switch to ${theme === "light" ? "dark" : "light"} mode`
    : "Toggle theme";

  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-[color:var(--color-card)] hover:opacity-90 transition-colors text-[color:var(--color-text)] cursor-pointer focus:outline-none focus:ring-0"
      title={title}
      type="button"
    >
      {mounted ? (
        theme === "light" ? (
          <Moon size={20} />
        ) : (
          <Sun size={20} />
        )
      ) : (
        <Sun size={20} />
      )}
    </button>
  );
}
