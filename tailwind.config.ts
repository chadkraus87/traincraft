import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16211B",
        pine: "#1E4D3B",
        moss: "#7BA88F",
        paper: "#F7F6F2",
        steel: "#5C6660",
        signal: "#E0A63C",
        alarm: "#B4552D",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
