import type { Config } from 'tailwindcss';

/**
 * Système de design SIGE — voir README.md pour le plan complet.
 *
 * Palette "chalkboard/notebook" : papier chaud + vert tableau noir comme
 * accent principal, plutôt que le bleu SaaS générique ou le crème+terracotta
 * devenus des réflexes IA. Choix ancré dans le sujet (école, tableau noir,
 * cahier) plutôt que décoratif.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F5',
        ink: '#20241F',
        board: {
          DEFAULT: '#2B4736',
          light: '#3D6349',
          dark: '#1B2E23',
        },
        chalk: '#E8C468',
        clay: '#A6472B',
        rule: '#DEDACD',
        muted: '#8A8575',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      borderRadius: {
        sige: '6px',
      },
    },
  },
  plugins: [],
};
export default config;
