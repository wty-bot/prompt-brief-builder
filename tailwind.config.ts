import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F5F7",
        vellum: "#FFFFFF",
        ink: "#1D1D1F",
        graphite: "#3A3A3C",
        moss: "#0071E3",
        deepmoss: "#0A84FF",
        amberline: "#FF9500",
        clay: "#E5E5EA",
        oxblood: "#D92D20",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0, 0, 0, 0.06)",
        lift: "0 18px 50px rgba(0, 0, 0, 0.12)",
        insetline: "inset 0 1px 0 rgba(255,255,255,0.72)",
      },
      backgroundImage: {
        "paper-grid":
          "linear-gradient(rgba(29,29,31,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(29,29,31,0.035) 1px, transparent 1px)",
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
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
