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
      keyframes: {
        // Chip slides to pot center (Rule 154-156)
        'chip-to-pot': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '80%': { transform: 'translateY(-40px) scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'translateY(-60px) scale(0.5)', opacity: '0' },
        },
        // Pot chips to winner
        'pot-to-winner': {
          '0%': { transform: 'translateY(0) scale(0.5)', opacity: '0' },
          '50%': { transform: 'translateY(30px) scale(0.9)', opacity: '0.8' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        // Card deal from deck (Rule 249)
        'card-deal': {
          '0%': { transform: 'translateX(-100px) translateY(-50px) rotate(-15deg) scale(0.3)', opacity: '0' },
          '60%': { transform: 'translateX(0) translateY(0) rotate(0deg) scale(1.05)', opacity: '1' },
          '100%': { transform: 'translateX(0) translateY(0) rotate(0deg) scale(1)', opacity: '1' },
        },
        // Card flip reveal
        'card-flip': {
          '0%': { transform: 'rotateY(180deg) scale(0.9)' },
          '100%': { transform: 'rotateY(0deg) scale(1)' },
        },
        // Fold animation - cards slide to muck (Rule 37, 102)
        'fold-to-muck': {
          '0%': { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: '1', filter: 'grayscale(0)' },
          '40%': { filter: 'grayscale(1)' },
          '100%': { transform: 'translateY(-30px) translateX(10px) rotate(8deg) scale(0.7)', opacity: '0.3', filter: 'grayscale(1)' },
        },
        // Winner glow pulse (Rule 107)
        'winner-glow': {
          '0%, 100%': { boxShadow: '0 0 5px 2px rgba(255, 215, 0, 0.4)' },
          '50%': { boxShadow: '0 0 20px 8px rgba(255, 215, 0, 0.7)' },
        },
        // Slide in from left (for community cards)
        'slide-in': {
          '0%': { transform: 'translateX(-20px) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
      },
      animation: {
        'chip-to-pot': 'chip-to-pot 600ms ease-out forwards',
        'pot-to-winner': 'pot-to-winner 800ms ease-out forwards',
        'card-deal': 'card-deal 400ms ease-out forwards',
        'card-flip': 'card-flip 300ms ease-in-out forwards',
        'fold-to-muck': 'fold-to-muck 500ms ease-in forwards',
        'winner-glow': 'winner-glow 1200ms ease-in-out infinite',
        'slide-in': 'slide-in 300ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
