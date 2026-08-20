// Séparé de route.ts : Next.js interdit les exports arbitraires dans un fichier
// route.ts (seuls GET/POST/dynamic/... sont des exports valides d'une Route).
// /api/property/promote importe cette clé pour invalider ce même cache après une
// promotion — une seule chaîne à faire évoluer si la clé change un jour.
export const CACHE_KEY = 'properties:promoted';
