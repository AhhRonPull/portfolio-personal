/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './Assets/js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        portfolio: {
          bg:          '#0B0F1A',   // ink navy
          surface:     '#111827',   // slightly lighter ink
          card:        '#0D1523',   // card background
          accent:      '#C9A24B',   // muted gold
          accentSoft:  '#DDB96A',   // lighter muted gold
          cream:       '#EDE6D6',   // ledger cream
          green:       '#4FA37A',   // bullish / fintech-green
          red:         '#B85450',   // bearish / fintech-red
          border:      'rgba(201,162,75,0.18)', // gold border subtle
        },
      },
    },
  },
  plugins: [],
};
