/**
 * Matche `/reels/{reelId}` (vue plein écran d'un réel unique, SingleReelClient.tsx) — pas
 * `/reels` (fil), `/reels/mine`, `/reels/add`, `/reels/select-property`, ni `/reels/{id}/edit`.
 * Utilisé pour masquer la navbar (`(protected)/layout.tsx`) et la barre de navigation mobile
 * (`BottomNavigation.tsx`) sur cette page : son conteneur vidéo est en `h-[100dvh]`, ces barres
 * ajoutent leur propre hauteur en plus et provoquent un scroll de page au lieu d'un rendu figé
 * plein écran.
 */
const SINGLE_REEL_VIEW_ROUTE_REGEX = /^\/reels\/(?!mine$|add$|select-property$)[^/]+\/?$/

export function isSingleReelViewRoute(pathname: string): boolean {
  return SINGLE_REEL_VIEW_ROUTE_REGEX.test(pathname)
}
