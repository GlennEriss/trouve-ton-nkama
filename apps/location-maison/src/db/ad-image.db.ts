const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function extractUploadErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const data = payload as { message?: unknown; error?: unknown }
  if (typeof data.message === 'string' && data.message.trim()) return data.message
  if (typeof data.error === 'string' && data.error.trim()) return data.error
  return fallback
}

export async function uploadAdCreativeImage(
  file: File,
  ownerUid: string,
): Promise<{ imageURL: string; imagePATH: string }> {
  const ext = EXT_BY_TYPE[file.type]
  if (!ext) {
    throw new Error('Format non supporté (JPG, PNG, WEBP ou GIF).')
  }

  if (!ownerUid) {
    throw new Error('Connecte-toi pour uploader une image.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/advertising/upload', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json().catch(() => null) as {
    success?: boolean
    imageURL?: string
    imagePATH?: string
    message?: string
    error?: string
  } | null

  if (!response.ok || !payload?.success || !payload.imageURL || !payload.imagePATH) {
    throw new Error(extractUploadErrorMessage(payload, "Échec de l'upload de l'image."))
  }

  return {
    imageURL: payload.imageURL,
    imagePATH: payload.imagePATH,
  }
}
