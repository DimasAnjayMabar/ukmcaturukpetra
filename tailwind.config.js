/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        digofa: ['DigofaBold', 'sans-serif'],
        delight: ['DelightRegular', 'sans-serif'],
        roxhead: ['Roxhead', 'sans-serif'],
        azedo: ['Azedo', 'sans-serif'],
        spekk: ['Spekk', 'sans-serif'],
        buccane: ['Buccane', 'sans-serif'],
        groote: ['Groote', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
};
