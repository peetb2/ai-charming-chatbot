import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0066cc",
          focus: "#0071e3",
          dark: "#2997ff",
        },
        ink: {
          DEFAULT: "#1d1d1f",
          muted: "#333333",
          light: "#7a7a7a",
        },
        canvas: {
          DEFAULT: "#ffffff",
          parchment: "#f5f5f7",
        },
        surface: {
          pearl: "#fafafc",
          tile1: "#272729",
          tile2: "#2a2a2c",
          tile3: "#252527",
          black: "#000000",
        },
        hairline: "#e0e0e0",
        sage: {
          50: '#F5F7F5',
          100: '#EAF0EC',
          200: '#D5DFD8',
          300: '#BDCEBF',
          400: '#8DAF93',
          500: '#6E9177',
          600: '#587A60',
          700: '#46624D',
          800: '#324738',
          900: '#1F2F24'
        },
        charcoal: '#111815',
        topobg: '#F7F8F6',
        sidebar: '#334539',
        sidebarHover: '#3D5244',
        sidebarActive: '#475C4E',
        sidebarBorder: '#2B3B30',
        appBg: '#F3F5F2',
        brandGreen: '#3B6B50',
        brandGreenHover: '#325A43',
        brandGreenLight: '#EBF3EE',
        brandGreenBorder: '#C9DCCF',
        cardBg: '#FFFFFF',
        borderLight: '#E2E8E3',
        textMain: '#1A231E',
        textMuted: '#68776E',
        textSubtle: '#96A49B',
        chartBlue: '#5482A6',
        chartDark: '#37434D',
      },
      fontFamily: {
        sans: ['Prompt', 'Inter', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        xs: "5px",
        sm: "8px",
        md: "11px",
        lg: "18px",
        pill: "9999px",
      },
      boxShadow: {
        product: "0 5px 30px rgba(0, 0, 0, 0.22)",
      },
      fontSize: {
        "hero-display": ["56px", { lineHeight: "1.07", letterSpacing: "-0.28px" }],
        "display-lg": ["40px", { lineHeight: "1.10", letterSpacing: "0" }],
        "display-md": ["34px", { lineHeight: "1.47", letterSpacing: "-0.374px" }],
        lead: ["28px", { lineHeight: "1.14", letterSpacing: "0.196px" }],
        tagline: ["21px", { lineHeight: "1.19", letterSpacing: "0.231px" }],
        "body-strong": ["17px", { lineHeight: "1.24", letterSpacing: "-0.374px" }],
        body: ["17px", { lineHeight: "1.47", letterSpacing: "-0.374px" }],
        caption: ["14px", { lineHeight: "1.43", letterSpacing: "-0.224px" }],
        "caption-strong": ["14px", { lineHeight: "1.29", letterSpacing: "-0.224px" }],
        "button-large": ["18px", { lineHeight: "1.0", letterSpacing: "0" }],
        "button-utility": ["14px", { lineHeight: "1.29", letterSpacing: "-0.224px" }],
        "fine-print": ["12px", { lineHeight: "1.0", letterSpacing: "-0.12px" }],
        "nav-link": ["12px", { lineHeight: "1.0", letterSpacing: "-0.12px" }],
      },
    },
  },
  plugins: [],
};
export default config;
