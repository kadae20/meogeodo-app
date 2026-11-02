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
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#1c1917",
        paper: "#f4efe6",
        pine: "#1b4d3e",
      },
      fontFamily: {
        landing: ["var(--font-landing-sans)", "ui-sans-serif", "system-ui"],
        "landing-mono": [
          "var(--font-landing-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
