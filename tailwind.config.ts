import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      height: {
        '100px': '100px',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-scale': 'fade-in-scale 0.5s forwards',
        'fade-out-scale': 'fade-out-scale 0.3s forwards',
        'bounce': 'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-out-scale': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '30%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '0', transform: 'scale(0)' },
        },
        'bounce': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.7)' },
        },
      },
      transitionTimingFunction: {
        'custom': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      transitionDelay: {
        '200': '200ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
};
export default config;
