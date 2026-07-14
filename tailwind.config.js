/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#1a1a1a',
          surface: '#222222',
          surfaceHigh: '#2d2d2c',
          charcoal: '#575756',
          gold: '#c18c2f',
          teal: '#0e647f',
          silver: '#c6c6c6',
          white: '#ffffff',
        },
      },
      fontFamily: {
        sans: ["'Raleway'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
