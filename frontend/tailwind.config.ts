import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyan:   "#00D4FF",
        blue:   "#0066FF",
        green:  "#00FF88",
        red:    "#FF3B5C",
        gold:   "#FFB800",
        purple: "#7B2FFF",
        "bg-primary":     "#050A0E",
        "bg-surface":     "#0D1421",
        "bg-elevated":    "#111C2D",
        "border-subtle":  "#1A2332",
        "text-secondary": "#8BA3BC",
        "text-muted":     "#4A6380",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      animation: {
        "ticker":     "ticker 30s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fadeIn":     "fadeIn 0.4s ease forwards",
        "scaleIn":    "scaleIn 0.3s ease forwards",
        "shimmer":    "shimmer 1.5s infinite",
        "flashGreen": "flashGreen 0.5s ease forwards",
        "flashRed":   "flashRed 0.5s ease forwards",
      },
      keyframes: {
        ticker: {
          "0%":   { transform: "translateX(0)"    },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,212,255,0.2)" },
          "50%":      { boxShadow: "0 0 40px rgba(0,212,255,0.5)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)"    },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        flashGreen: {
          "0%":   { background: "rgba(0,255,136,0.2)" },
          "100%": { background: "transparent"          },
        },
        flashRed: {
          "0%":   { background: "rgba(255,59,92,0.2)" },
          "100%": { background: "transparent"          },
        },
      },
      backgroundImage: {
        "grad-cyan":   "linear-gradient(135deg, #00D4FF, #0066FF)",
        "grad-green":  "linear-gradient(135deg, #00FF88, #00D4FF)",
        "grad-red":    "linear-gradient(135deg, #FF3B5C, #FF6B35)",
        "grad-gold":   "linear-gradient(135deg, #FFB800, #FF6B35)",
        "grad-purple": "linear-gradient(135deg, #7B2FFF, #00D4FF)",
      },
      boxShadow: {
        "glow-cyan":   "0 0 30px rgba(0,212,255,0.25)",
        "glow-green":  "0 0 30px rgba(0,255,136,0.25)",
        "glow-red":    "0 0 30px rgba(255,59,92,0.25)",
        "glow-gold":   "0 0 30px rgba(255,184,0,0.25)",
        "glow-purple": "0 0 30px rgba(123,47,255,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;