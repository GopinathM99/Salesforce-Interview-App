export type ThemeId = "dark-default" | "light" | "high-contrast" | "mocha-mousse" | "bubblegum" | "notebook" | "graphite" | "steampunk" | "pop-art";

export interface Theme {
  id: ThemeId;
  name: string;
  font?: {
    heading: string;
    body: string;
    scale?: number;
  };
  colors: {
    bg: string;
    card: string;
    cardForeground: string;
    text: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    accent2: string;
    accent3: string;
    accent4: string;
    danger: string;
    success: string;
    border: string;
    borderSubtle: string;
    borderHighlight: string;
    input: string;
    gradientCardStart: string;
    gradientCardEnd: string;
    gradientBtnStart: string;
    gradientBtnEnd: string;
    accentGlow: string;
    successGlow: string;
    dangerGlow: string;
    accentBgSubtle: string;
    successBgSubtle: string;
    dangerBgSubtle: string;
    warningBgSubtle: string;
    warningBorder: string;
    warningText: string;
  };
}

export const themes: Record<ThemeId, Theme> = {
  "dark-default": {
    id: "dark-default",
    name: "Dark (Default)",
    colors: {
      bg: "#0a0e1a",
      card: "#1a1f2e",
      cardForeground: "#f1f5f9",
      text: "#f1f5f9",
      muted: "#94a3b8",
      mutedForeground: "#334155",
      accent: "#3b82f6",
      accentForeground: "#0f172a",
      accent2: "#10b981",
      accent3: "#8b5cf6",
      accent4: "#f59e0b",
      danger: "#ef4444",
      success: "#10b981",
      border: "#334155",
      borderSubtle: "rgba(59, 130, 246, 0.2)",
      borderHighlight: "rgba(59, 130, 246, 0.4)",
      input: "#475569",
      gradientCardStart: "#1e293b",
      gradientCardEnd: "#334155",
      gradientBtnStart: "#1e293b",
      gradientBtnEnd: "#334155",
      accentGlow: "rgba(59, 130, 246, 0.3)",
      successGlow: "rgba(16, 185, 129, 0.3)",
      dangerGlow: "rgba(239, 68, 68, 0.3)",
      accentBgSubtle: "rgba(59, 130, 246, 0.1)",
      successBgSubtle: "rgba(16, 185, 129, 0.1)",
      dangerBgSubtle: "rgba(239, 68, 68, 0.1)",
      warningBgSubtle: "rgba(245, 158, 11, 0.1)",
      warningBorder: "rgba(245, 158, 11, 0.3)",
      warningText: "#92400e",
    },
  },
  light: {
    id: "light",
    name: "Light",
    colors: {
      bg: "#f8fafc",
      card: "#ffffff",
      cardForeground: "#0f172a",
      text: "#0f172a",
      muted: "#64748b",
      mutedForeground: "#94a3b8",
      accent: "#2563eb",
      accentForeground: "#ffffff",
      accent2: "#059669",
      accent3: "#7c3aed",
      accent4: "#d97706",
      danger: "#dc2626",
      success: "#059669",
      border: "#e2e8f0",
      borderSubtle: "rgba(37, 99, 235, 0.2)",
      borderHighlight: "rgba(37, 99, 235, 0.4)",
      input: "#e2e8f0",
      gradientCardStart: "#ffffff",
      gradientCardEnd: "#f1f5f9",
      gradientBtnStart: "#f1f5f9",
      gradientBtnEnd: "#e2e8f0",
      accentGlow: "rgba(37, 99, 235, 0.2)",
      successGlow: "rgba(5, 150, 105, 0.2)",
      dangerGlow: "rgba(220, 38, 38, 0.2)",
      accentBgSubtle: "rgba(37, 99, 235, 0.08)",
      successBgSubtle: "rgba(5, 150, 105, 0.08)",
      dangerBgSubtle: "rgba(220, 38, 38, 0.08)",
      warningBgSubtle: "rgba(217, 119, 6, 0.08)",
      warningBorder: "rgba(217, 119, 6, 0.3)",
      warningText: "#b45309",
    },
  },
  "high-contrast": {
    id: "high-contrast",
    name: "High Contrast",
    colors: {
      bg: "#000000",
      card: "#1a1a1a",
      cardForeground: "#ffffff",
      text: "#ffffff",
      muted: "#a0a0a0",
      mutedForeground: "#666666",
      accent: "#00d4ff",
      accentForeground: "#000000",
      accent2: "#00ff88",
      accent3: "#ff66ff",
      accent4: "#ffcc00",
      danger: "#ff4444",
      success: "#00ff88",
      border: "#444444",
      borderSubtle: "rgba(0, 212, 255, 0.4)",
      borderHighlight: "rgba(0, 212, 255, 0.7)",
      input: "#333333",
      gradientCardStart: "#1a1a1a",
      gradientCardEnd: "#2a2a2a",
      gradientBtnStart: "#2a2a2a",
      gradientBtnEnd: "#3a3a3a",
      accentGlow: "rgba(0, 212, 255, 0.5)",
      successGlow: "rgba(0, 255, 136, 0.5)",
      dangerGlow: "rgba(255, 68, 68, 0.5)",
      accentBgSubtle: "rgba(0, 212, 255, 0.15)",
      successBgSubtle: "rgba(0, 255, 136, 0.15)",
      dangerBgSubtle: "rgba(255, 68, 68, 0.15)",
      warningBgSubtle: "rgba(255, 204, 0, 0.15)",
      warningBorder: "rgba(255, 204, 0, 0.5)",
      warningText: "#ffcc00",
    },
  },
  "mocha-mousse": {
    id: "mocha-mousse",
    name: "Mocha Mousse",
    font: {
      heading: "Georgia, 'Times New Roman', serif",
      body: "Georgia, 'Times New Roman', serif",
    },
    colors: {
      bg: "#faf6f0",
      card: "#fff9f0",
      cardForeground: "#5c3d2e",
      text: "#5c3d2e",
      muted: "#8b7355",
      mutedForeground: "#a89080",
      accent: "#6b4423",
      accentForeground: "#fff9f0",
      accent2: "#7d9b76",
      accent3: "#8b6914",
      accent4: "#c4956a",
      danger: "#a04030",
      success: "#5a7a50",
      border: "#d4c4a8",
      borderSubtle: "rgba(92, 61, 46, 0.2)",
      borderHighlight: "rgba(92, 61, 46, 0.4)",
      input: "#f5ede0",
      gradientCardStart: "#fff9f0",
      gradientCardEnd: "#f5ede0",
      gradientBtnStart: "#f5ede0",
      gradientBtnEnd: "#e8dcc8",
      accentGlow: "rgba(107, 68, 35, 0.25)",
      successGlow: "rgba(90, 122, 80, 0.3)",
      dangerGlow: "rgba(160, 64, 48, 0.3)",
      accentBgSubtle: "rgba(107, 68, 35, 0.08)",
      successBgSubtle: "rgba(90, 122, 80, 0.1)",
      dangerBgSubtle: "rgba(160, 64, 48, 0.1)",
      warningBgSubtle: "rgba(196, 149, 106, 0.12)",
      warningBorder: "rgba(196, 149, 106, 0.4)",
      warningText: "#8b6914",
    },
  },
  bubblegum: {
    id: "bubblegum",
    name: "Bubblegum",
    colors: {
      bg: "#fff0f5",
      card: "#ffffff",
      cardForeground: "#4a1942",
      text: "#4a1942",
      muted: "#9b6b8a",
      mutedForeground: "#c9a0b8",
      accent: "#ff69b4",
      accentForeground: "#ffffff",
      accent2: "#40e0d0",
      accent3: "#87ceeb",
      accent4: "#ffd700",
      danger: "#ff6b6b",
      success: "#40e0d0",
      border: "#ffb6c1",
      borderSubtle: "rgba(255, 105, 180, 0.3)",
      borderHighlight: "rgba(255, 105, 180, 0.5)",
      input: "#ffe4ec",
      gradientCardStart: "#ffffff",
      gradientCardEnd: "#fff0f5",
      gradientBtnStart: "#ffe4ec",
      gradientBtnEnd: "#ffb6c1",
      accentGlow: "rgba(255, 105, 180, 0.4)",
      successGlow: "rgba(64, 224, 208, 0.4)",
      dangerGlow: "rgba(255, 107, 107, 0.4)",
      accentBgSubtle: "rgba(255, 105, 180, 0.12)",
      successBgSubtle: "rgba(64, 224, 208, 0.12)",
      dangerBgSubtle: "rgba(255, 107, 107, 0.12)",
      warningBgSubtle: "rgba(255, 215, 0, 0.12)",
      warningBorder: "rgba(255, 215, 0, 0.4)",
      warningText: "#b8860b",
    },
  },
  notebook: {
    id: "notebook",
    name: "Notebook",
    font: {
      heading: "'Caveat', cursive",
      body: "'Caveat', cursive",
      scale: 1.2,
    },
    colors: {
      bg: "#f5f5dc",
      card: "#fffef5",
      cardForeground: "#2d3748",
      text: "#2d3748",
      muted: "#718096",
      mutedForeground: "#a0aec0",
      accent: "#2d3748",
      accentForeground: "#f5f5dc",
      accent2: "#2d3748",
      accent3: "#2d3748",
      accent4: "#f39c12",
      danger: "#c53030",
      success: "#276749",
      border: "#d4c4a8",
      borderSubtle: "rgba(45, 55, 72, 0.2)",
      borderHighlight: "rgba(45, 55, 72, 0.4)",
      input: "#fffef5",
      gradientCardStart: "#fffef5",
      gradientCardEnd: "#f5f5dc",
      gradientBtnStart: "#f5f5dc",
      gradientBtnEnd: "#e8e4c9",
      accentGlow: "rgba(45, 55, 72, 0.2)",
      successGlow: "rgba(39, 103, 73, 0.25)",
      dangerGlow: "rgba(197, 48, 48, 0.25)",
      accentBgSubtle: "rgba(45, 55, 72, 0.08)",
      successBgSubtle: "rgba(39, 103, 73, 0.1)",
      dangerBgSubtle: "rgba(197, 48, 48, 0.1)",
      warningBgSubtle: "rgba(243, 156, 18, 0.1)",
      warningBorder: "rgba(243, 156, 18, 0.35)",
      warningText: "#d68910",
    },
  },
  graphite: {
    id: "graphite",
    name: "Graphite",
    font: {
      heading: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      body: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    colors: {
      bg: "#1a1a1a",
      card: "#2d2d2d",
      cardForeground: "#e0e0e0",
      text: "#e0e0e0",
      muted: "#888888",
      mutedForeground: "#555555",
      accent: "#808080",
      accentForeground: "#ffffff",
      accent2: "#a0a0a0",
      accent3: "#707070",
      accent4: "#b0b0b0",
      danger: "#c0c0c0",
      success: "#a0a0a0",
      border: "#404040",
      borderSubtle: "rgba(128, 128, 128, 0.3)",
      borderHighlight: "rgba(128, 128, 128, 0.6)",
      input: "#363636",
      gradientCardStart: "#2d2d2d",
      gradientCardEnd: "#363636",
      gradientBtnStart: "#363636",
      gradientBtnEnd: "#404040",
      accentGlow: "rgba(128, 128, 128, 0.3)",
      successGlow: "rgba(160, 160, 160, 0.3)",
      dangerGlow: "rgba(192, 192, 192, 0.3)",
      accentBgSubtle: "rgba(128, 128, 128, 0.12)",
      successBgSubtle: "rgba(160, 160, 160, 0.12)",
      dangerBgSubtle: "rgba(192, 192, 192, 0.12)",
      warningBgSubtle: "rgba(176, 176, 176, 0.12)",
      warningBorder: "rgba(176, 176, 176, 0.35)",
      warningText: "#b0b0b0",
    },
  },
  steampunk: {
    id: "steampunk",
    name: "Steampunk",
    font: {
      heading: "'Playfair Display', Didot, 'Times New Roman', Times, serif",
      body: "'Playfair Display', Didot, 'Times New Roman', Times, serif",
    },
    colors: {
      bg: "#1c1410",
      card: "#2a1f18",
      cardForeground: "#f5f0e6",
      text: "#f5f0e6",
      muted: "#8b7355",
      mutedForeground: "#5c4a3a",
      accent: "#cd7f32",
      accentForeground: "#1c1410",
      accent2: "#b87333",
      accent3: "#8b4513",
      accent4: "#daa520",
      danger: "#8b0000",
      success: "#b87333",
      border: "#5c4a3a",
      borderSubtle: "rgba(205, 127, 50, 0.35)",
      borderHighlight: "rgba(205, 127, 50, 0.6)",
      input: "#3d2e24",
      gradientCardStart: "#2a1f18",
      gradientCardEnd: "#3d2e24",
      gradientBtnStart: "#3d2e24",
      gradientBtnEnd: "#4a3828",
      accentGlow: "rgba(205, 127, 50, 0.45)",
      successGlow: "rgba(184, 115, 51, 0.45)",
      dangerGlow: "rgba(139, 0, 0, 0.45)",
      accentBgSubtle: "rgba(205, 127, 50, 0.18)",
      successBgSubtle: "rgba(184, 115, 51, 0.18)",
      dangerBgSubtle: "rgba(139, 0, 0, 0.18)",
      warningBgSubtle: "rgba(218, 165, 32, 0.18)",
      warningBorder: "rgba(218, 165, 32, 0.45)",
      warningText: "#daa520",
    },
  },
  "pop-art": {
    id: "pop-art",
    name: "Pop-Art",
    font: {
      heading: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
      body: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
    },
    colors: {
      bg: "#ffeb3b",
      card: "#ffffff",
      cardForeground: "#c41e3a",
      text: "#c41e3a",
      muted: "#8b0000",
      mutedForeground: "#757575",
      accent: "#e53935",
      accentForeground: "#ffffff",
      accent2: "#e53935",
      accent3: "#e53935",
      accent4: "#ff5722",
      danger: "#e53935",
      success: "#e53935",
      border: "#1a1a2e",
      borderSubtle: "rgba(196, 30, 58, 0.3)",
      borderHighlight: "rgba(196, 30, 58, 0.6)",
      input: "#fff59d",
      gradientCardStart: "#ffffff",
      gradientCardEnd: "#fff9c4",
      gradientBtnStart: "#e53935",
      gradientBtnEnd: "#c62828",
      accentGlow: "rgba(229, 57, 53, 0.5)",
      successGlow: "rgba(229, 57, 53, 0.5)",
      dangerGlow: "rgba(229, 57, 53, 0.5)",
      accentBgSubtle: "rgba(229, 57, 53, 0.15)",
      successBgSubtle: "rgba(229, 57, 53, 0.15)",
      dangerBgSubtle: "rgba(229, 57, 53, 0.15)",
      warningBgSubtle: "rgba(255, 87, 34, 0.15)",
      warningBorder: "rgba(255, 87, 34, 0.45)",
      warningText: "#bf360c",
    },
  },
};

export const DEFAULT_THEME: ThemeId = "dark-default";

export function getTheme(id: ThemeId): Theme {
  return themes[id] || themes[DEFAULT_THEME];
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  
  const root = document.documentElement;
  const { colors } = theme;

  root.style.setProperty("--bg", colors.bg);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--card-foreground", colors.cardForeground);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--muted-foreground", colors.mutedForeground);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", colors.accentForeground);
  root.style.setProperty("--accent-2", colors.accent2);
  root.style.setProperty("--accent-3", colors.accent3);
  root.style.setProperty("--accent-4", colors.accent4);
  root.style.setProperty("--danger", colors.danger);
  root.style.setProperty("--success", colors.success);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--border-subtle", colors.borderSubtle);
  root.style.setProperty("--border-highlight", colors.borderHighlight);
  root.style.setProperty("--input", colors.input);
  root.style.setProperty("--gradient-card-start", colors.gradientCardStart);
  root.style.setProperty("--gradient-card-end", colors.gradientCardEnd);
  root.style.setProperty("--gradient-btn-start", colors.gradientBtnStart);
  root.style.setProperty("--gradient-btn-end", colors.gradientBtnEnd);
  root.style.setProperty("--accent-glow", colors.accentGlow);
  root.style.setProperty("--success-glow", colors.successGlow);
  root.style.setProperty("--danger-glow", colors.dangerGlow);
  root.style.setProperty("--accent-bg-subtle", colors.accentBgSubtle);
  root.style.setProperty("--success-bg-subtle", colors.successBgSubtle);
  root.style.setProperty("--danger-bg-subtle", colors.dangerBgSubtle);
  root.style.setProperty("--warning-bg-subtle", colors.warningBgSubtle);
  root.style.setProperty("--warning-border", colors.warningBorder);
  root.style.setProperty("--warning-text", colors.warningText);

  // Also set derived variables used by shadcn
  root.style.setProperty("--background", colors.bg);
  root.style.setProperty("--foreground", colors.text);
  root.style.setProperty("--popover", colors.card);
  root.style.setProperty("--popover-foreground", colors.cardForeground);
  root.style.setProperty("--primary", colors.accent);
  root.style.setProperty("--primary-foreground", colors.accentForeground);
  root.style.setProperty("--secondary", colors.gradientCardStart);
  root.style.setProperty("--secondary-foreground", colors.text);
  root.style.setProperty("--destructive", colors.danger);
  root.style.setProperty("--ring", colors.accent);

  // Apply fonts
  const defaultFont = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  if (theme.font) {
    root.style.setProperty("--font-heading", theme.font.heading);
    root.style.setProperty("--font-body", theme.font.body);
    root.style.setProperty("--font-scale", String(theme.font.scale || 1));
  } else {
    root.style.setProperty("--font-heading", defaultFont);
    root.style.setProperty("--font-body", defaultFont);
    root.style.setProperty("--font-scale", "1");
  }
}
