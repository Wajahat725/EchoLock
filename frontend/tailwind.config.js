export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#f1f3fb',
          100: '#e5e9f7',
          200: '#cbd3ee',
          300: '#a5b3e1',
          400: '#788ed0',
          500: '#566dbb',
          600: '#3e55a1',
          700: '#304487',
          800: '#29396f',
          900: '#25325b',
          950: '#171f3b',
        },
        cream: {
          50: '#fffdf7',
          100: '#fbf7e9',
          200: '#f4ebcf',
          300: '#ead9ad',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};