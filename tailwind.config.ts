import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#F2F0EB",
        coral: "#EC6B3A",
        terracotta: "#F2895E",
        paper: "#121110",
        surface: "#1C1B18",
        steel: "#A39E92",
        signal: "#F4A93A",
        alarm: "#E2503F",
        success: "#5DA83A",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
