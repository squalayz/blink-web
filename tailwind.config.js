/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0f",
        surface: "#111118",
        surface2: "#1a1a24",
        indigo: { DEFAULT: "#6366f1", glow: "rgba(99,102,241,0.3)" },
        cyan: { DEFAULT: "#06b6d4", glow: "rgba(6,182,212,0.3)" },
        purple: { DEFAULT: "#a855f7", glow: "rgba(168,85,247,0.3)" },
        dim: "#3a3a4a",
        muted: "#6b6b80",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
