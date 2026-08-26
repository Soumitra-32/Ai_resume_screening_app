/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0E1116',
          900: '#151A21',
          800: '#1E252F',
          700: '#2A3340',
          600: '#3C4859',
        },
        paper: '#F4F6F5',
        signal: {
          DEFAULT: '#3FE0C5',
          dim: '#28B39C',
        },
        flag: '#F2A65A',
        line: '#2A3340',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '3px',
      },
    },
  },
  plugins: [],
};