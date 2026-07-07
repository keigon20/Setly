import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0C',
        surface: '#1A1A1E',
        surfaceAlt: '#222228',
        border: '#2A2A30',
        textPrimary: '#F0F0F5',
        textSecondary: '#A0A0B0',
        textTertiary: '#606070',
        accent: '#4A90E2',
        destructive: '#FF3B30',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
