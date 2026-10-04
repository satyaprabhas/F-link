/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cmd': {
          'bg': '#f8fafc',          // Clean light neutral background (Slate 50)
          'panel': '#ffffff',       // Pure white sidebar and header
          'card': '#ffffff',        // Pure white cards
          'border': '#e2e8f0',      // Soft light gray borders (Slate 200)
          'accent': '#0f766e',      // Deep Teal / Military Green primary (Teal 700)
          'accent2': '#0d9488',     // Secondary teal accent (Teal 600)
          'success': '#16a34a',     // Normal / Safe green (Green 600)
          'warning': '#d97706',     // Warning / Medium risk (Amber 600)
          'danger': '#dc2626',      // High / Danger red (Red 600)
          'critical': '#b91c1c',    // Critical risk dark red (Red 700)
          'text': '#0f172a',        // Sharp dark charcoal text (Slate 900)
          'muted': '#64748b',       // Neutral slate secondary text (Slate 500)
          'highlight': '#115e59',   // Deep teal headings (Teal 800)
          'subtle': '#f1f5f9',      // Subtle slate for hovers/alternating rows (Slate 100)
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
};
