import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#00FF7F",
          dark: "#0A0A0A"
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
