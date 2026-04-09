/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        /* Brand colors */
        accent: {
          DEFAULT: '#e05c28',
          light: '#f28c60',
        },
        /* Warm palette */
        warm: {
          white: '#f2f0eb',
          muted: '#9a9690',
          dim: '#504e4b',
        },
        /* Dark surfaces */
        ink: '#0a0a0a',
        surface: {
          DEFAULT: '#111111',
          2: '#161616',
          3: '#1e1e1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        display: '-0.03em',
        label: '0.14em',
      },
      borderRadius: {
        card: '1.25rem',
      },
    },
  },
  plugins: [],
};
