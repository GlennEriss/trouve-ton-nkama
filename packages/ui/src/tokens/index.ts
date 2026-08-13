/**
 * Source de vérité unique de la marque Tonnkama (rampe teal, ancres primary =
 * #146B67, secondary = #1FA89B). Référence canonique historique :
 * apps/location-maison/src/app/globals.css.
 *
 * Deux apps consomment ces valeurs sous deux formats différents (contrainte
 * réelle, pas une négligence) :
 * - apps/location-maison : Tailwind v3, config JS (tailwind.config.ts) +
 *   variables CSS en HSL ("H S% L%", sans hsl()) dans globals.css.
 * - apps/location-maison-admin : Tailwind v4 CSS-first (@theme inline), pas
 *   de config JS possible côté couleurs — variables CSS en hex dans
 *   globals.css.
 * Ce module ne génère pas automatiquement les deux CSS (pas d'outillage de
 * build pour ça dans ce repo) : il sert de référence à corriger les deux
 * globals.css à la main quand l'un dérive de l'autre.
 */

export const brandColorsHsl = {
  primary50: "174.5 57.9% 96.3%",
  primary100: "170.4 47.2% 89.6%",
  primary200: "173.7 53.6% 75.5%",
  primary300: "172.6 49.5% 58%",
  primary400: "171.8 58.2% 44.1%",
  primary500: "174.3 68.8% 39%",
  primary600: "174.2 70.4% 31.8%",
  primary700: "177.2 68.5% 24.9%",
  primary800: "177.5 70.6% 20%",
  primary900: "175.6 69.6% 15.5%",
  primary950: "175.8 72.9% 11.6%",
  ink: "199.7 48.5% 25.9%",
  gold: "42.7 46.4% 62%",
  sky: "195.4 45.9% 83.3%",
  peach: "29.1 89.2% 85.5%",
  success: "160.1 84.1% 39.4%",
  warning: "37.7 92.1% 50.2%",
  destructive: "0 84.2% 60.2%",
} as const;

export const brandColorsHex = {
  primary50: "#f0fbfa",
  primary100: "#d8f1ed",
  primary200: "#9fe2db",
  primary300: "#5fc9bc",
  primary400: "#2fb2a0",
  primary500: "#1fa89b",
  primary600: "#188a7f",
  primary700: "#146b67",
  primary800: "#0f5754",
  primary900: "#0c433f",
  primary950: "#083330",
  ink: "#224d62",
  gold: "#cbb171",
  sky: "#c1dee8",
  peach: "#fbd9b9",
  success: "#10b981",
  warning: "#f59e0b",
  destructive: "#ef4444",
} as const;

/** Rayon de bordure canonique — les deux apps doivent utiliser 0.5rem. */
export const radiusRem = 0.5;

/** Police canonique (Inter, via next/font/google dans chaque app). */
export const fontFamily = "Inter";
