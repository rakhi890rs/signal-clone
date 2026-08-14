/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          blue: "#2C6BED",
          "blue-dark": "#1B4DBF",
          bg: "#0E0F10",
          "bg-secondary": "#17181A",
          "bg-tertiary": "#1E2022",
          "bg-hover": "#26282B",
          border: "#2A2C2F",
          "text-primary": "#E9E9EA",
          "text-secondary": "#9A9CA1",
          "text-muted": "#6B6D72",
          "bubble-out": "#2C6BED",
          "bubble-in": "#26282B",
          online: "#4ADE80",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        bubble: "18px",
      },
    },
  },
  plugins: [],
};
