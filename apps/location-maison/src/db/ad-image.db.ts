const getStorage = () => import('@/firebase/storage')

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

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
    return "Erreur inconnue lors de l'envoi de l'image."
  }

  const maybeWithCode = error as Error & { code?: string }

  if (maybeWithCode.code === 'storage/unauthorized') {
    return "Vous n'avez pas l'autorisation d'uploader cette image."
  }
  if (maybeWithCode.code === 'storage/canceled') {
    return 'Envoi annulé.'
  }
  if (maybeWithCode.code === 'storage/retry-limit-exceeded') {
    return 'Envoi trop long. Vérifiez la connexion puis réessayez.'
  }

  return error.message || "Échec de l'envoi de l'image."
}

export async function uploadAdCreativeImage(
  file: File,
  ownerUid: string,
): Promise<{ imageURL: string; imagePATH: string }> {
  const ext = EXT_BY_TYPE[file.type]
  if (!ext) {
    throw new Error('Format non supporté (JPG, PNG, WEBP ou GIF).')
  }

  try {
    const { storage, ref, uploadBytes, getDownloadURL } = await getStorage()
    const imagePATH = `ad-campaigns/${ownerUid}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const fileRef = ref(storage, imagePATH)

    await withTimeout(
      uploadBytes(fileRef, file, {
        contentType: file.type,
        customMetadata: {
          owner: ownerUid,
          kind: 'ad-creative-image',
        },
      }),
      300_000,
      'Upload image pub',
    )
    const imageURL = await withTimeout(getDownloadURL(fileRef), 15_000, 'Récupération URL image pub')

    return { imageURL, imagePATH }
  } catch (error) {
    throw new Error(extractStorageErrorMessage(error))
  }
}
