/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Repris tel quel de src/theme/colors.ts (lui-même tiré des tokens réels de la PWA,
      // apps/location-maison/src/app/globals.css) — une seule source de vérité pour les
      // couleurs, que ce soit consommé via colors.ts (StyleSheet) ou des classes Tailwind.
      colors: {
        primary: '#146B67',
        secondary: '#1FA89B',
        background: '#FAFBFC',
        foreground: '#111827',
        destructive: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        border: '#D1D5DB',
        muted: '#6B7280',
      },
    },
  },
  plugins: [],
};
