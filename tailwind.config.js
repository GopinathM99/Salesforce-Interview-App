/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.{css}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0e1a',
        card: '#1a1f2e',
        foreground: '#f1f5f9',
        muted: '#94a3b8',
        accent: {
          DEFAULT: '#3b82f6',
          foreground: '#0f172a',
          '2': '#10b981',
          '3': '#8b5cf6',
          '4': '#f59e0b'
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#064e3b'
        },
        danger: {
          DEFAULT: '#ef4444',
          foreground: '#7f1d1d'
        }
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans',
          'Ubuntu',
          'Cantarell',
          'Helvetica Neue',
          'Arial',
          'Apple Color Emoji',
          'Segoe UI Emoji'
        ],
        mono: [
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      },
      maxWidth: {
        content: '900px'
      },
      boxShadow: {
        card: '0 10px 40px rgba(0, 0, 0, 0.2)'
      },
      borderRadius: {
        xl: '12px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: []
};
