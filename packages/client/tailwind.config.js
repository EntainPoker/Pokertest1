/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        poker: {
          green: '#1a5c2e',
          felt: '#2d8a4e',
          gold: '#d4af37',
          dark: '#0f1419',
        },
      },
    },
  },
  plugins: [],
};
