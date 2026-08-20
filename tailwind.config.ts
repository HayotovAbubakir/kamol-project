import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'rgb(var(--app-bg) / <alpha-value>)',
          text: 'rgb(var(--app-text) / <alpha-value>)',
          muted: 'rgb(var(--app-muted) / <alpha-value>)',
          accent: 'rgb(var(--app-accent) / <alpha-value>)',
          card: 'rgb(var(--app-card) / <alpha-value>)',
          'card-soft': 'rgb(var(--app-card-soft) / <alpha-value>)',
          border: 'rgb(var(--app-border) / <alpha-value>)',
          sidebar: 'rgb(var(--app-sidebar) / <alpha-value>)',
        },
        editorial: {
          bg: '#EFEDE6',
          text: '#1D2720',
          accent: '#58715F',
          card: '#DFE5DA',
        },
        metallic: {
          green: '#5CB88A',
          dark: '#1A3D2E',
          black: '#0A0A0A',
        },
        deadline: {
          green: '#2D6A4F',
          yellow: '#CA8A04',
          red: '#BB2D1E',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['var(--font-sans)', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'dark-gradient':
          'linear-gradient(145deg, #0A0A0A 0%, #0F1814 35%, #142820 55%, #0A0A0A 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
