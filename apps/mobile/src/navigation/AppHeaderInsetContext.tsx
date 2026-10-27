import { createContext, useContext } from 'react';

// Indique à ScreenHeader (components/ScreenHeader.tsx) que l'inset de sécurité du haut d'écran
// est déjà consommé par un en-tête ambiant au-dessus (AppHeader, hamburger/logo — voir
// AppDrawer.tsx), pour qu'il n'applique pas une deuxième fois ce padding. Fournie à `true`
// uniquement par ProfileStack (voir ProfileStack.tsx) : tous ses écrans (Mes annonces,
// Paramètres, Connexion et sécurité, et les pages légales lorsqu'elles sont ouvertes depuis le
// menu Profil) sont toujours montés sous l'onglet "ProfilOuConnexion" de MainTabs, où AppHeader
// est systématiquement affiché. Favoris et les pages légales ouvertes depuis le menu hamburger
// (AppDrawerContent) restent en dehors de ce contexte (valeur par défaut `false`) : ce sont des
// écrans de premier niveau du Drawer sans AppHeader au-dessus, qui ont donc réellement besoin de
// l'inset.
export const AppHeaderInsetContext = createContext(false);

export function useAppHeaderConsumedTopInset(): boolean {
  return useContext(AppHeaderInsetContext);
}
