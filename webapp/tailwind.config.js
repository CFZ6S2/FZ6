module.exports = {
  content: [
    "./*.{html,js}",
    "./js/**/*.js",
    "!./node_modules/**"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#9B59B6', // Violeta
          DEFAULT: '#4A90E2', // Azul
          dark: '#2C3E50',
          glass: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.12)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Premium font
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
