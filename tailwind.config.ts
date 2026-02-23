import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        primaryDark: "#1E40AF",
        accent: "#14B8A6",
        background: "#F8FAFC",
        textPrimary: "#0F172A",
        textSecondary: "#64748B",
        border: "#E2E8F0",
      },
    },
  },
  plugins: [],
};

export default config;

