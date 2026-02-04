import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sdp: {
          primary: "#f48735",
          accent: "#01a85a",
          green: "#008751",
        },
      },
      minHeight: {
        touch: "44px",
      },
      spacing: {
        "spacing-1": "0.25rem",
        "spacing-2": "0.5rem",
        "spacing-4": "1rem",
        "spacing-6": "1.5rem",
        "spacing-8": "2rem",
        "spacing-12": "3rem",
      },
      maxWidth: {
        "content": "72rem",
        "content-narrow": "48rem",
      },
      fontSize: {
        "display": ["2rem", { lineHeight: "1.2" }],
        "display-sm": ["1.75rem", { lineHeight: "1.25" }],
        "title": ["1.25rem", { lineHeight: "1.4" }],
        "body": ["1rem", { lineHeight: "1.5" }],
        "caption": ["0.875rem", { lineHeight: "1.4" }],
        "overline": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.05em" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
