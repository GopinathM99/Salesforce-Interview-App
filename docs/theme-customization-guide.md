# Theme Customization Guide

This document outlines all the places where theme-specific styling (fonts, colors, buttons) are configured.

## 1. Theme Definition File

**File:** `lib/themes.ts`

### Adding Custom Fonts to a Theme

Add the optional `font` property to any theme:

```typescript
"your-theme-id": {
  id: "your-theme-id",
  name: "Your Theme Name",
  font: {
    heading: "Georgia, 'Times New Roman', serif",  // Font for h1-h6
    body: "Georgia, 'Times New Roman', serif",     // Font for body text
  },
  colors: {
    // ... color definitions
  },
},
```

**Example (Mocha Mousse):**
```typescript
"mocha-mousse": {
  id: "mocha-mousse",
  name: "Mocha Mousse",
  font: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
  },
  colors: { ... },
},
```

### Button Color Variables

These variables control button appearance:

| Variable | Purpose | Light Theme Value | Dark Theme Value |
|----------|---------|-------------------|------------------|
| `gradientBtnStart` | Default button background start | Light color (e.g., `#f5ede0`) | Dark color (e.g., `#1e293b`) |
| `gradientBtnEnd` | Default button background end | Slightly darker (e.g., `#e8dcc8`) | Slightly lighter (e.g., `#334155`) |
| `accent` | Primary button background | Theme accent color | Theme accent color |
| `accentForeground` | Primary button text color | Light for dark accent, dark for light accent | Usually light |
| `accent2` | Success/Next button color | Green variant | Green variant |
| `accent3` | Reveal button color | Purple/secondary variant | Purple/secondary variant |

**Important for Light Themes:**
- `gradientBtnStart` and `gradientBtnEnd` should be LIGHT colors
- `text` color (used for default button text) should be DARK
- This ensures readable text on default buttons

**Example (Mocha Mousse - Light Theme):**
```typescript
colors: {
  text: "#5c3d2e",                    // Dark brown text
  accent: "#6b4423",                  // Dark brown accent
  accentForeground: "#fff9f0",        // Light text on accent buttons
  gradientBtnStart: "#f5ede0",        // Light beige button bg
  gradientBtnEnd: "#e8dcc8",          // Slightly darker beige
  // ...
}
```

---

## 2. CSS Variables

**File:** `styles/globals.css`

### Font Variables (in `:root`)

```css
:root {
  /* Font variables - defaults, overridden by theme */
  --font-heading: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-body: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
```

### Font Application (in `@layer base`)

```css
body {
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
```

### Button Classes Using Theme Variables

| CSS Class | Uses Variables |
|-----------|----------------|
| `.btn` | `--gradient-btn-start`, `--gradient-btn-end`, `--text`, `--border-subtle` |
| `.btn.primary` | `--accent`, `--accent-foreground`, `--accent-glow` |
| `.btn.success` | `--accent-2`, `--accent-foreground`, `--success-glow` |
| `.btn.danger` | `--danger`, `--accent-foreground`, `--danger-glow` |
| `.btn.reveal-btn` | `--accent-3`, `--accent-foreground`, `--accent-glow` |
| `.btn.next-btn` | `--accent-2`, `--accent-foreground`, `--success-glow` |
| `.btn.back-btn` | `--accent`, `--accent-foreground`, `--accent-glow` |

---

## 3. Theme Application Logic

**File:** `lib/themes.ts` (applyTheme function)

The `applyTheme()` function sets CSS variables on `document.documentElement`:

```typescript
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  // Colors
  root.style.setProperty("--bg", colors.bg);
  root.style.setProperty("--text", colors.text);
  // ... all color variables
  
  // Fonts
  const defaultFont = "ui-sans-serif, system-ui, ...";
  if (theme.font) {
    root.style.setProperty("--font-heading", theme.font.heading);
    root.style.setProperty("--font-body", theme.font.body);
  } else {
    root.style.setProperty("--font-heading", defaultFont);
    root.style.setProperty("--font-body", defaultFont);
  }
}
```

---

## 4. Theme Type Definition

**File:** `lib/themes.ts`

```typescript
export type ThemeId = "dark-default" | "light" | "high-contrast" | "emerald" | "mocha-mousse" | "bubblegum" | "notebook" | "graphite" | "steampunk" | "pop-art";

export interface Theme {
  id: ThemeId;
  name: string;
  font?: {
    heading: string;
    body: string;
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
```

---

## 5. Quick Reference: Adding a New Theme with Custom Font

1. **Add theme ID to type** (`lib/themes.ts` line 1):
   ```typescript
   export type ThemeId = "..." | "your-new-theme";
   ```

2. **Add theme definition** (`lib/themes.ts` in `themes` object):
   ```typescript
   "your-new-theme": {
     id: "your-new-theme",
     name: "Your New Theme",
     font: {
       heading: "Your Heading Font, fallback",
       body: "Your Body Font, fallback",
     },
     colors: {
       // Copy from existing theme and modify
     },
   },
   ```

3. **Test the theme** by selecting it from the theme dropdown in the app.

---

## 6. Common Font Stacks

| Style | Font Stack |
|-------|------------|
| System Sans | `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |
| Serif | `Georgia, 'Times New Roman', Times, serif` |
| Monospace | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace` |
| Handwritten | `'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive` |
| Typewriter | `'Courier New', Courier, 'Lucida Console', monospace` |

---

## 7. Files Modified for Theme Support

| File | Changes |
|------|---------|
| `lib/themes.ts` | Theme definitions, font property, applyTheme function |
| `lib/ThemeContext.tsx` | Theme context provider, localStorage persistence |
| `styles/globals.css` | CSS variables, font variables, button classes |
| `app/layout.tsx` | ThemeProvider wrapper |
| `components/ThemeSelector.tsx` | Theme selector UI |
| `components/AuthStatus.tsx` | Theme selector in user menu |
| `app/flashcards/page.tsx` | Removed hardcoded fonts/colors |
| `app/mcq/page.tsx` | Removed hardcoded fonts/colors |
| `app/flashcards/bookmarks/page.tsx` | Removed hardcoded fonts/colors |
| `app/mcq/bookmarks/page.tsx` | Removed hardcoded fonts/colors |
| `app/page.tsx` | Removed hardcoded fonts/colors |
| `app/admin/edit-questions/page.tsx` | Removed hardcoded fonts/colors |

---

## 8. Session Notes & Lessons Learned

### Themes Already Updated with Custom Fonts

| Theme | Font Stack | Status |
|-------|------------|--------|
| Mocha Mousse | `Georgia, 'Times New Roman', serif` | ✅ Complete |
| Notebook | `'Lucida Handwriting', 'Brush Script MT', 'Segoe Script', cursive` | ✅ Complete |
| Dark Default | System sans-serif (default) | No custom font |
| Light | System sans-serif (default) | Needs update |
| High Contrast | System sans-serif (default) | Needs update |
| Emerald | System sans-serif (default) | Needs update |
| Bubblegum | System sans-serif (default) | Needs update |
| Graphite | System sans-serif (default) | Needs update |
| Steampunk | System sans-serif (default) | Needs update |
| Pop-Art | System sans-serif (default) | Needs update |

### Critical Issues Fixed

1. **Grayed-out buttons on light themes**: For light themes, `gradientBtnStart` and `gradientBtnEnd` MUST be light colors (matching the background), not dark. The `text` color provides contrast.

2. **Button text visibility**: 
   - Default `.btn` uses `var(--text)` for text color
   - Primary/colored buttons use `var(--accent-foreground)`
   - For light themes: light button bg + dark text
   - For dark themes: dark button bg + light text

3. **Unified button colors for monochrome themes**: For themes like Notebook where all buttons should be the same color, set `accent`, `accent2`, and `accent3` to the same value.

### Light Theme Button Pattern

```typescript
// For ANY light theme, follow this pattern:
colors: {
  text: "#2d3748",                    // DARK text color
  accent: "#2d3748",                  // Button accent (can be dark)
  accentForeground: "#f5f5dc",        // LIGHT text on accent buttons
  gradientBtnStart: "#f5f5dc",        // LIGHT - matches/near bg color
  gradientBtnEnd: "#e8e4c9",          // LIGHT - slightly darker than start
}
```

### Dark Theme Button Pattern

```typescript
// For ANY dark theme, follow this pattern:
colors: {
  text: "#f1f5f9",                    // LIGHT text color
  accent: "#3b82f6",                  // Button accent color
  accentForeground: "#ffffff",        // LIGHT text on accent buttons
  gradientBtnStart: "#1e293b",        // DARK - matches/near bg color
  gradientBtnEnd: "#334155",          // DARK - slightly lighter than start
}
```

### Suggested Font Stacks for Remaining Themes

| Theme | Suggested Font Style | Font Stack |
|-------|---------------------|------------|
| Bubblegum | Playful/Rounded | `'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive` |
| Graphite | Clean/Modern | `'Helvetica Neue', Arial, sans-serif` |
| Steampunk | Victorian/Ornate | `'Playfair Display', 'Didot', 'Times New Roman', serif` |
| Pop-Art | Bold/Retro | `'Impact', 'Arial Black', 'Helvetica Neue', sans-serif` |
| High Contrast | Accessible/Clear | `'Verdana', 'Trebuchet MS', sans-serif` |
| Emerald | Elegant/Nature | `'Palatino Linotype', 'Book Antiqua', Palatino, serif` |

### Testing Checklist After Theme Updates

1. [ ] Select theme from dropdown
2. [ ] Check Home page - buttons visible and readable
3. [ ] Check Flashcards page - all buttons (Bookmark, Back, Reveal, Next) visible
4. [ ] Check MCQ page - all buttons visible
5. [ ] Check fonts apply to headings and body text
6. [ ] Hard refresh (Cmd+Shift+R) to clear cache if needed
7. [ ] Run `npm run build` to verify no errors
