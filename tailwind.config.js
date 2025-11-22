/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./webapp/**/*.{html,js}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
