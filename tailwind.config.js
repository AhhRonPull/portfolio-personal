/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './Assets/js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        portfolio: {
          bg: '#040914',
          surface: '#0a1329',
          accent: '#d4af37',
          accentSoft: '#f5d76e',
        },
      },
    },
  },
  plugins: [],
};
