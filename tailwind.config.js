/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0f",
        surface: "#0d0d14",
        surface2: "#1a1a24",
        blink: {
          DEFAULT: "#00FF88",
          green: "#00FF88",
          green2: "#88FF00",
          glow: "rgba(0,255,136,0.4)",
          glowSoft: "rgba(0,255,136,0.2)",
        },
        green: { DEFAULT: "#00FF88", glow: "rgba(0,255,136,0.4)" },
        dim: "#3a3a4a",
        muted: "#6b6b80",
      },
      fontFamily: {
        sans: ["Inter", "Outfit", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      boxShadow: {
        blinkGlow: "0 0 24px rgba(0,255,136,0.4), 0 0 48px rgba(0,255,136,0.2)",
        blinkGlowSoft: "0 0 16px rgba(0,255,136,0.25)",
      },
    },
  },
  plugins: [],
};
