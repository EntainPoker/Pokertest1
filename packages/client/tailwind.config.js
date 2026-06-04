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
          green: '#2e7d32',
          felt: '#1b5e20',
          gold: '#ffd700',
          dark: '#1a1a2e',
        },
      },
    },
  },
  plugins: [],
};
