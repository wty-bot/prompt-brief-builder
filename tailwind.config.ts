import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F1E5",
        ink: "#1F2520",
        moss: "#0F766E",
        amberline: "#D97706",
        clay: "#E7D8BF",
      },
      boxShadow: {
        soft: "0 24px 60px rgba(31, 37, 32, 0.12)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
