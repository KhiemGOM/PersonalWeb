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
        // Palette: near-black base, bold accent colors for sections
        void: "#0a0a0a",
        "robot-body": "#e8e0d4",
        "robot-shadow": "#2a2420",
        "accent-hero": "#f5c842",
        "accent-about": "#4a9eff",
        "accent-projects": "#ff6b4a",
        "accent-competitions": "#7c4aff",
        "accent-misc": "#4aff9e",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
