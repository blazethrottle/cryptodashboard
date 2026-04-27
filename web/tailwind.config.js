/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e14",
        surface: "#11161e",
        surface2: "#1a212c",
        border: "#262e3b",
        muted: "#6c7686",
        text: "#d8dde6",
        accent: "#7c8aff",
        buy: "#22c55e",
        sell: "#ef4444",
        watch: "#3b82f6",
        neutral: "#6c7686",
        warn: "#eab308",
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
