/** Farbwerte sind aus packages/shared/src/tokens.ts gespiegelt (Quelle der Wahrheit).
 * Niemals Pink/Magenta ergänzen (Designregel aus SPEC.md Abschnitt 0). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg0: "#05070C",
        bg1: "#07090F",
        bg2: "#0A0D16",
        bg3: "#0D1120",
        line: "#1B2740",
        text: "#C9D6E8",
        "text-muted": "#6B7A94",
        "text-faint": "#45526B",
        cyan: "#00D4FF",
        ice: "#7DF9FF",
        green: "#00FF9D",
        red: "#FF5A5A",
        violet: "#A855F7",
        "violet-light": "#C084FC",
        gold: "#FFD166",
        orange: "#FF7A1A",
        "orange-light": "#FFA04D",
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        body: ["Inter", "sans-serif"],
      },
      backdropBlur: {
        glass: "14px",
      },
      borderRadius: {
        card: "16px",
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        "pulse-red": "pulse-red 1.4s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.85", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.01)" },
        },
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,90,90,0.55)" },
          "50%": { boxShadow: "0 0 0 6px rgba(255,90,90,0)" },
        },
      },
    },
  },
  plugins: [],
};
