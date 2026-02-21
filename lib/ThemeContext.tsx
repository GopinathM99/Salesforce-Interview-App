"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type ThemeId,
  type Theme,
  themes,
  DEFAULT_THEME,
  getTheme,
  applyTheme,
} from "./themes";

const STORAGE_KEY = "app_theme";

interface ThemeContextValue {
  themeId: ThemeId;
  theme: Theme;
  setTheme: (id: ThemeId) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initialTheme = (stored && stored in themes) ? stored as ThemeId : DEFAULT_THEME;
    setThemeId(initialTheme);
    // Apply theme immediately on mount
    applyTheme(getTheme(initialTheme));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = getTheme(themeId);
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId, mounted]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
  }, []);

  const value: ThemeContextValue = {
    themeId,
    theme: getTheme(themeId),
    setTheme,
    availableThemes: Object.values(themes),
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
