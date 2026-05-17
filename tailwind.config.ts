import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4EEE2",
        vellum: "#FFF9EF",
        ink: "#161A16",
        graphite: "#2A302B",
        moss: "#0D9488",
        deepmoss: "#0F5F59",
        amberline: "#D98A1B",
        clay: "#E4D3B8",
        oxblood: "#8A3B2F",
      },
      boxShadow: {
        soft: "0 24px 60px rgba(22, 26, 22, 0.12)",
        lift: "0 34px 90px rgba(22, 26, 22, 0.18)",
        insetline: "inset 0 1px 0 rgba(255,255,255,0.48)",
      },
      backgroundImage: {
        "paper-grid":
          "linear-gradient(rgba(22,26,22,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(22,26,22,0.045) 1px, transparent 1px)",
      },
      keyframes: {
        "soft-rise": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan-line": {
          "0%": { transform: "translateX(-110%)" },
          "100%": { transform: "translateX(110%)" },
        },
        pulseglow: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
      },
      animation: {
        "soft-rise": "soft-rise 520ms ease-out both",
        "scan-line": "scan-line 1.8s ease-in-out infinite",
        pulseglow: "pulseglow 2.6s ease-in-out infinite",
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
