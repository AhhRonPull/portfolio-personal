/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './Assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        portfolio: {
          bg: '#060d1e',
          surface: '#0d1a33',
          accent: '#d4af37',
          accentSoft: '#f5d76e',
        },
      },
    },
  },
  plugins: [],
};
