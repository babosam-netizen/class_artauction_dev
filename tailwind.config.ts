import type { Config } from 'tailwindcss';
import { tokens } from './src/theme/tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        museum: {
          base: tokens.color.bgBase,
          floor: tokens.color.bgFloor,
          panel: tokens.color.panel,
        },
        gold: {
          DEFAULT: tokens.color.gold,
          tint: tokens.color.goldTint,
        },
        cream: {
          DEFAULT: tokens.color.cream,
          dim: tokens.color.creamDim,
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['Noto Sans KR', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
