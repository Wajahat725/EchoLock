/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a0e27',
          light: '#121836',
          lighter: '#1a2347',
        },
        cyan: {
          accent: '#00d4ff',
          muted: '#00d4ff33',
        },
        success: '#00ff88',
        danger: '#ff3860',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 212, 255, 0.25)',
        'glow-success': '0 0 20px rgba(0, 255, 136, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
