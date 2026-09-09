// Reprend les tokens réels de la PWA (apps/location-maison/src/app/globals.css:14-38 +
// tailwind.config.ts:28-42) — jamais de couleur devinée. Conversion HSL -> hex faite à la main
// à partir des valeurs CSS sources, une seule fois ici, pour que tout écran mobile importe
// depuis ce fichier plutôt que de re-décider une palette.
export const colors = {
  primary: '#146B67', // --primary-700 (ancre "primary" de la marque)
  secondary: '#1FA89B', // --primary-500 (ancre "secondary")
  background: '#FAFBFC', // --background (hsl(210 33% 98.4%))
  foreground: '#111827', // --foreground (hsl(220 39% 11%))
  destructive: '#EF4444', // --destructive (hsl(0 84.2% 60.2%))
  success: '#10B981', // --success (hsl(160.1 84.1% 39.4%))
  warning: '#F59E0B', // --warning (hsl(37.7 92.1% 50.2%))
  border: '#D1D5DB', // gris neutre utilisé pour les bordures d'input/bouton outline sur le web
  mutedText: '#6B7280', // text-gray-500/600 utilisé pour les sous-titres sur le web
} as const;
