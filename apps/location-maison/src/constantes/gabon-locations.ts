/**
 * Les 9 provinces du Gabon avec les coordonnées approximatives de leur chef-lieu.
 * Les coordonnées servent à centrer la carte et à biaiser la recherche Google Places
 * (villes / quartiers) sur la bonne zone.
 */

export interface GabonProvince {
  name: string;
  /** Chef-lieu indicatif (utilisé pour le centrage de la carte). */
  capital: string;
  lat: number;
  lng: number;
}

export const GABON_PROVINCES: ReadonlyArray<GabonProvince> = [
  { name: 'Estuaire', capital: 'Libreville', lat: 0.4162, lng: 9.4673 },
  { name: 'Haut-Ogooué', capital: 'Franceville', lat: -1.6332, lng: 13.5833 },
  { name: 'Moyen-Ogooué', capital: 'Lambaréné', lat: -0.7001, lng: 10.2306 },
  { name: 'Ngounié', capital: 'Mouila', lat: -1.8654, lng: 11.0556 },
  { name: 'Nyanga', capital: 'Tchibanga', lat: -2.8489, lng: 11.0244 },
  { name: 'Ogooué-Ivindo', capital: 'Makokou', lat: 0.5715, lng: 12.8642 },
  { name: 'Ogooué-Lolo', capital: 'Koulamoutou', lat: -1.1366, lng: 12.4663 },
  { name: 'Ogooué-Maritime', capital: 'Port-Gentil', lat: -0.7193, lng: 8.7815 },
  { name: 'Woleu-Ntem', capital: 'Oyem', lat: 1.5993, lng: 11.5793 },
] as const;

/** Centre géographique approximatif du Gabon (fallback carte). */
export const GABON_CENTER = { lat: -0.8, lng: 11.6 };

export function getProvinceByName(name?: string | null): GabonProvince | undefined {
  if (!name) return undefined;
  return GABON_PROVINCES.find((p) => p.name === name);
}
