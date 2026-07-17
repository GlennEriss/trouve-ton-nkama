/**
 * @module db
 *
 * Upload direct client → Storage pour les créas vidéo publicitaires (emplacement
 * reels_infeed uniquement). Fichier séparé de `ad-campaign.db.ts` (100% Admin
 * SDK côté serveur) pour ne pas mélanger runtime client et Admin SDK dans le
 * même module. Contourne volontairement `/api/advertising/upload` (bufferise
 * tout le fichier en mémoire Node, inadapté à une vidéo jusqu'à 500 Mo) :
 * upload direct au SDK client, même pattern que
 * `uploadRawReelVideo` (reel.db.ts) et `createFile` (file.db.ts).
 */

const getStorage = () => import('@/firebase/storage')

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${operation} a pris trop de temps.`))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

function extractStorageErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erreur inconnue lors de l'envoi de la vidéo."
  }

  const maybeWithCode = error as Error & { code?: string }

  if (maybeWithCode.code === 'storage/unauthorized') {
    return "Vous n'avez pas l'autorisation d'uploader cette vidéo."
  }
  if (maybeWithCode.code === 'storage/canceled') {
    return 'Envoi annulé.'
  }
  if (maybeWithCode.code === 'storage/retry-limit-exceeded') {
    return 'Envoi trop long (délai dépassé). Vérifiez la connexion puis réessayez.'
  }

  return error.message || "Échec de l'envoi de la vidéo."
}

/**
 * Uploade une vidéo de créa publicitaire directement dans Storage et renvoie
 * son URL publique. `ownerUid` doit être l'uid Firebase Auth de l'utilisateur
 * connecté (vérifié par storage.rules — écriture refusée sinon).
 */
export async function uploadAdCreativeVideo(
  file: File,
  ownerUid: string,
): Promise<{ videoURL: string; videoPATH: string }> {
  try {
    const { storage, ref, uploadBytes, getDownloadURL } = await getStorage()
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'mp4'
    const videoPATH = `ad-campaigns-video/${ownerUid}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const fileRef = ref(storage, videoPATH)

    // Timeout généreux (5 min) : fichiers jusqu'à 500 Mo, contrairement aux
    // 120s de uploadRawReelVideo (fichiers réels plus petits en pratique) ou
    // aux 20s de createFile (images d'annonces immobilières).
    await withTimeout(uploadBytes(fileRef, file), 300_000, 'Upload vidéo pub')
    const videoURL = await withTimeout(getDownloadURL(fileRef), 15_000, 'Récupération URL vidéo pub')

    return { videoURL, videoPATH }
  } catch (error) {
    throw new Error(extractStorageErrorMessage(error))
  }
}
