/**
 * Détecte une erreur de chargement de chunk JS (webpack/Next.js) : le cas le plus fréquent
 * d'"Application error: a client-side exception" en production — un onglet déjà ouvert AVANT
 * un déploiement tente de charger un fichier de build qui n'existe plus une fois le nouveau
 * déploiement en place (noms de fichiers hashés par build). Aucun bug applicatif : un simple
 * rechargement récupère toujours la dernière version. Voir error.tsx/global-error.tsx.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message || ''
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk [\w.-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  )
}
