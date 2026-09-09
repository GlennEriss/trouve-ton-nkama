import { API_BASE_URL } from '../api/client';

// Miroir exact de HOME_PROVINCES (apps/location-maison/src/constantes/home-page.ts) — les 9
// provinces réelles du Gabon, jamais des villes génériques inventées. `logo` (g1-g9.webp) est
// le champ RÉELLEMENT utilisé par PropertyByProvince.tsx (web) — pas `img`, qui existe dans la
// constante web mais n'est pas ce que la carte province affiche (erreur corrigée ici après
// retour utilisateur : les mauvaises images étaient affichées). Servi par le même backend
// Next.js que le reste de l'app (voir client.ts).
export const HOME_PROVINCES: ReadonlyArray<{ name: string; logo: string }> = [
  { name: 'Estuaire', logo: 'g1.webp' },
  { name: 'Haut-Ogooué', logo: 'g2.webp' },
  { name: 'Moyen-Ogooué', logo: 'g3.webp' },
  { name: 'Ngounié', logo: 'g4.webp' },
  { name: 'Nyanga', logo: 'g5.webp' },
  { name: 'Ogooué-Ivindo', logo: 'g6.webp' },
  { name: 'Ogooué-Lolo', logo: 'g7.webp' },
  { name: 'Ogooué-Maritime', logo: 'g8.webp' },
  { name: 'Woleu-Ntem', logo: 'g9.webp' },
];

export function getProvinceImageUrl(logo: string): string {
  return `${API_BASE_URL}/assets/home-page/${logo}`;
}
