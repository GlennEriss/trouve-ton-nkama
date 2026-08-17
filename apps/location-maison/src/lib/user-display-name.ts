/**
 * Nom affiché d'un utilisateur.
 *
 * Beaucoup d'annonceurs sont des boutiques : le nom sous lequel ils veulent apparaître n'est pas
 * leur état civil. Le champ `pseudo` porte ce nom d'affichage ; il est optionnel, et l'immense
 * majorité des comptes créés avant son introduction n'en ont pas — d'où le repli systématique sur
 * "firstname lastname".
 *
 * Toute surface qui affiche un nom doit passer par ici, pour qu'un annonceur ne se voie pas
 * désigné par sa boutique à un endroit et par son état civil à un autre.
 */

type DisplayableUser = {
  pseudo?: string | null;
  firstname?: string | null;
  lastname?: string | null;
} | null | undefined;

/**
 * @returns le nom à afficher, ou `null` si l'utilisateur n'a aucun nom exploitable (l'appelant
 * décide alors de son propre repli : "Vendeur", masquer la ligne, etc.).
 */
export function getUserDisplayName(user: DisplayableUser): string | null {
  const pseudo = user?.pseudo?.trim();
  if (pseudo) {
    return pseudo;
  }

  const fullName = [user?.firstname, user?.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return fullName || null;
}

/**
 * Initiale pour les avatars de repli. Dérivée du même nom que ci-dessus, sinon l'avatar et le
 * libellé juste à côté afficheraient deux identités différentes.
 */
export function getUserDisplayInitial(user: DisplayableUser): string {
  return getUserDisplayName(user)?.at(0)?.toUpperCase() ?? '';
}
