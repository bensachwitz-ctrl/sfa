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
        // Forest green palette
        forest: {
          darkest: "#0a1f0a",  // sidebar bg
          dark:    "#1a3a1a",  // dark accents, dividers
          DEFAULT: "#2d5a2d",  // primary accent — buttons, active nav
          mid:     "#3d6e3d",  // hover states
          light:   "#4d7c3f",  // secondary accents
          sage:    "#8ab87a",  // chart highlights, muted accents
        },
        // Cream palette
        cream: {
          DEFAULT: "#f5f0e0",  // page background
          card:    "#fdfaf4",  // card backgrounds
          hover:   "#eee8d8",  // hover states on cream
          border:  "#d8e8c4",  // card borders, dividers
          deep:    "#c8d4b0",  // stronger borders
        },
        // Text tokens (reference via text-ink-* classes)
        ink: {
          DEFAULT: "#1a2e1a",  // primary text (dark forest)
          mid:     "#4a5e4a",  // secondary text
          muted:   "#7a8e7a",  // muted labels
          faint:   "#a0b8a0",  // placeholder / very muted
        },
        // Keep brand as alias
        brand: {
          50:  "#f0fdf0",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#2d5a2d",
          600: "#1a3a1a",
          700: "#14521a",
          800: "#0f3d14",
          900: "#0a1f0a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "sidebar-gradient": "linear-gradient(180deg, #0a1f0a 0%, #0f2e0f 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
