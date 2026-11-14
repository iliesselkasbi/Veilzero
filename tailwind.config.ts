import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050505", // Darker abyss
        surface: "#0a0a0a",
        "surface-alt": "#141414",
        border: "#2A2A2A",
        primary: "#4ECDC4",
        "primary-dim": "#2A7A74",
        terminal: "#00FF41", // Classic hacker green
        danger: "#EF4444",
        "danger-dim": "#7F1D1D",
        success: "#22C55E",
        text: "#E5E5E5",
        "text-muted": "#737373",
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        mono: ["JetBrains Mono", "monospace"],
        body: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-red": "pulse-red 1.5s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "crt-flicker": "crt-flicker 0.15s infinite",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.7)" },
          "50%": { boxShadow: "0 0 0 10px rgba(239, 68, 68, 0)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "crt-flicker": {
          "0%": { opacity: "0.95" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.98" },
        }
      },
      boxShadow: {
        glow: "0 0 20px rgba(78, 205, 196, 0.1)",
        "glow-danger": "0 0 20px rgba(239, 68, 68, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;