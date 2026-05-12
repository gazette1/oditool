/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: { 1: "#0d1117", 2: "#151c28", 3: "#1c2536" },
        accent: "#c8a45c",
        dim: "#6a7585",
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', "monospace"],
        display: ['"Space Grotesk"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
