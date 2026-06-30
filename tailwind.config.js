/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border-strong, rgba(100, 130, 180, 0.22))",
        input: "var(--border, rgba(100, 130, 180, 0.12))",
        ring: "var(--theme-accent, #1A6AFF)",
        background: "var(--bg, #080a0f)",
        foreground: "var(--text, #eef0f4)",
        primary: {
          DEFAULT: "var(--theme-accent, #1A6AFF)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--bg2, #0f1118)",
          foreground: "var(--text, #eef0f4)",
        },
        destructive: {
          DEFAULT: "var(--red, #FF4D4D)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--bg3, #161b27)",
          foreground: "var(--text2, #a8b4c0)",
        },
        accent: {
          DEFAULT: "var(--bg2, #0f1118)",
          foreground: "var(--text, #eef0f4)",
        },
        popover: {
          DEFAULT: "var(--bg2, #0f1118)",
          foreground: "var(--text, #eef0f4)",
        },
        card: {
          DEFAULT: "var(--bg-card, rgba(15, 20, 32, 0.95))",
          foreground: "var(--text, #eef0f4)",
        },
        tremor: {
          background: {
            subtle: '#f3f4f6',
          },
          'content-emphasis': '#374151',
        },
        'dark-tremor': {
          background: {
            subtle: '#1f2937',
          },
          'content-emphasis': '#d1d5db',
        },
        brand: {
          DEFAULT: '#1A6AFF',
          glow: 'rgba(26, 106, 255, 0.15)',
        },
        status: {
          active: '#10B981',
          activeGlow: 'rgba(16, 185, 129, 0.15)',
          disconnected: '#F59E0B',
          disconnectedGlow: 'rgba(245, 158, 11, 0.15)',
        },
        text: {
          primary: '#ECE8F2',
          secondary: '#eef0f4',
        },
      },
      fontFamily: {
        headline: ["Public Sans", "sans-serif"],
        display: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"],
        label: ["JetBrains Mono", "monospace"],
        // Map Tailwind defaults to the design system so font-serif / font-sans /
        // font-mono render the intended webfonts across the ported mockup pages.
        sans: ["Inter", "DM Sans", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "DM Serif Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
        'tremor-small': '0.375rem',
        'tremor-default': '0.5rem',
      },
      fontSize: {
        'tremor-label': ['0.75rem'],
      },
      animation: {
        marquee: "marquee var(--duration, 20s) infinite linear",
        "appear-zoom-fast": "appear-zoom 0.3s forwards ease-out",
        hover: "hover 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "hover-reverse": "hover-reverse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fade": "pulse-fade 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-hover": "pulse-hover 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        wiggle: "wiggle 1s ease-in-out infinite",
        impulse: "impulse 2s ease-in-out infinite",
        "appear-slide": "appear-slide 0.5s forwards cubic-bezier(0.4, 0.18, 0.52, 1.6)",
        orbit: "orbit 2s linear infinite",
        rotate: "rotate 8s linear infinite",
        "shiny-text": "shiny-text 2.5s infinite",
        reveal: "reveal 3s forwards",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "pulse-hover": {
          "0%, 100%": { opacity: 1, transform: "translateY(0)" },
          "50%": { opacity: 0.5, transform: "translateY(-1rem)" },
        },
        hover: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-1rem) translateX(1rem)" },
        },
        "hover-reverse": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(1rem) translateX(1rem)" },
        },
        "pulse-fade": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.3 },
        },
        wiggle: {
          "0%, 16.67%, 33.33%, 50%, 100%": { transform: "rotate(-15deg)" },
          "8.33%, 25%, 41.67%": { transform: "rotate(15deg)" },
          "50%, 100%": { transform: "rotate(0deg)" },
        },
        impulse: {
          "20%": { left: 0, transform: "scale(0.5)", opacity: 0 },
          "50%": { opacity: 1, left: "50%", transform: "scale(3)" },
          "80%": { opacity: 0, left: "100%", transform: "scale(0.5)" },
        },
        orbit: {
          "0%": { strokeDashoffset: 500, opacity: 0 },
          "10%, 20%": { opacity: 1 },
          "35%": { opacity: 0 },
          "40%": { opacity: 0, strokeDashoffset: -250 },
        },
        "appear-slide": {
          "0%": { opacity: 0, transform: "translateY(3rem) scale(0.5)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        rotate: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "shiny-text": {
          "0%": { backgroundPosition: "calc(-100% - 200px) 0" },
          "100%": { backgroundPosition: "calc(100% + 200px) 0" },
        },
        reveal: {
          "0%": { filter: "blur(10px)", opacity: 0 },
          "100%": { filter: "blur(0px)", opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
