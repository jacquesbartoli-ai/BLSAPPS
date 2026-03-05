import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F6F1E8",
        foreground: "#183027",
        primary: {
          DEFAULT: "#1D3A2F",
          foreground: "#F6F1E8"
        },
        accent: {
          DEFAULT: "#D5C3A5",
          foreground: "#183027"
        },
        card: "#FFFDF8",
        border: "#DCCFB9"
      }
    }
  },
  plugins: []
};

export default config;
