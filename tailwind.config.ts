import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a5f",
        },
        surface: {
          DEFAULT: "#0d1117",
          secondary: "#161b22",
          tertiary: "#1a1a2e",
          elevated: "#21262d",
          hover: "#30363d",
        },
        border: {
          DEFAULT: "#21262d",
          subtle: "#16213e",
          hover: "#30363d",
        },
        accent: {
          DEFAULT: "#00D4FF",
          hover: "#00b8d9",
          muted: "rgba(0, 212, 255, 0.15)",
          subtle: "rgba(0, 212, 255, 0.08)",
        },
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px
        "3xs": ["0.5625rem", { lineHeight: "0.75rem" }], // 9px
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "slide-in-left": "slideInLeft 0.2s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      boxShadow: {
        "glow-sm": "0 0 8px rgba(0, 212, 255, 0.12)",
        "glow": "0 0 16px rgba(0, 212, 255, 0.15)",
        "glow-lg": "0 0 24px rgba(0, 212, 255, 0.2)",
        "panel": "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
