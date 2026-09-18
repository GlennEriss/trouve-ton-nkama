// Miroir de apps/location-maison/src/lib/user-display-name.ts +
// generateColorFromName.ts — même règle d'affichage (pseudo d'abord, sinon prénom+nom) et même
// algorithme de couleur d'avatar (déterministe par nom) des deux côtés, pour qu'un utilisateur
// ne se voie pas affiché différemment web/mobile. Voir [[feedback-mobile-reuse-pwa-design]].
type DisplayableUser =
  | {
      pseudo?: string | null;
      firstname?: string | null;
      lastname?: string | null;
    }
  | null
  | undefined;

export function getUserDisplayName(user: DisplayableUser): string | null {
  const pseudo = user?.pseudo?.trim();
  if (pseudo) return pseudo;

  const fullName = [user?.firstname, user?.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return fullName || null;
}

export function getUserDisplayInitial(user: DisplayableUser): string {
  return getUserDisplayName(user)?.at(0)?.toUpperCase() ?? '';
}

// hsl(...) valide directement comme valeur de couleur RN (>= 0.71) — pas besoin de convertir en
// hex, contrairement à nameToColorHex (web, non utilisé ici : c'est generateColorFromName, pas
// nameToColorHex, qui alimente l'avatar de ProfilInformations.tsx).
export function generateColorFromName(name: string | undefined | null): string {
  if (!name) return '#ccc';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 70%, 80%)`;
}
