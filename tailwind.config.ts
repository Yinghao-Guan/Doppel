import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0f",
          card: "#11121a",
          elevated: "#1a1c26",
        },
        accent: {
          DEFAULT: "#7c5cff",
          glow: "#a78bfa",
          green: "#34d399",
          red: "#f87171",
          amber: "#fbbf24",
        },
        muted: "#6b7280",
        border: "#2a2d3a",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(124, 92, 255, 0.15)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(124, 92, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 92, 255, 0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
