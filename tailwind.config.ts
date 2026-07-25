import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A1A1A",
        coral: "#D85A30",
        terracotta: "#E8825C",
        paper: "#D4D2CC",
        steel: "#6B6558",
        signal: "#EF9F27",
        alarm: "#C6362F",
        success: "#4C9A2A",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
