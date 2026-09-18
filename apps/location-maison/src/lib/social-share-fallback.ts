// Instagram et TikTok n'exposent aucun intent web pour partager un lien externe (contrairement
// à Facebook/WhatsApp/X/Threads) : impossible de pré-remplir un post ou une story depuis un
// simple lien. Seule option réaliste : la Web Share API (l'utilisateur choisit l'app installée
// dans la feuille de partage native, Instagram/TikTok y figurent s'ils sont installés), avec
// repli sur la copie du lien dans le presse-papiers si l'API n'est pas disponible (desktop).
// Même pattern déjà utilisé pour TikTok dans ReelsFeedClient.tsx.
export async function shareViaNativeOrCopy(input: {
  url: string
  title: string
  text: string
}): Promise<'native' | 'copy' | 'failed'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: input.title, text: input.text, url: input.url })
      return 'native'
    } catch {
      // L'utilisateur a annulé la feuille de partage, ou l'API a échoué : pas de repli vers la
      // copie, ce serait une action inattendue après une annulation volontaire.
      return 'failed'
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(input.url)
      return 'copy'
    } catch {
      return 'failed'
    }
  }

  return 'failed'
}
