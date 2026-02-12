/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        telos: { cyan: '#00F2FE', blue: '#4FACFE', purple: '#C471F5' },
      },
    },
  },
  plugins: [],
}
