import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

import { adminApp } from '@/firebase/admin'
import { auth } from '@/next-auth/auth'
import { createLogger } from '@/lib/logger'
import { jsonApiError } from '@/lib/api/error-response'

const logger = createLogger('api.advertising.upload')

const MAX_BYTES = 3 * 1024 * 1024 // 3 Mo
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(request: Request) {
  const session = await auth()
  const uid = session?.user?.uid
  if (!uid) {
    return jsonApiError(401, 'UNAUTHENTICATED', 'Authentification requise.')
  }
  if (!adminApp) {
    return jsonApiError(500, 'INTERNAL_ERROR', 'Firebase admin non initialisé.')
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Requête multipart invalide.')
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Fichier manquant.')
  }
  const ext = EXT_BY_TYPE[file.type]
  if (!ext) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Format non supporté (JPG, PNG, WEBP ou GIF).')
  }
  if (file.size > MAX_BYTES) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Image trop lourde (max 3 Mo).')
  }

  try {
    const { getStorage } = await import('firebase-admin/storage')
    const bucket = getStorage(adminApp).bucket()
    const imagePATH = `ad-campaigns/${uid}/${Date.now()}-${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const downloadToken = randomUUID()
    const gcsFile = bucket.file(imagePATH)
    await gcsFile.save(buffer, {
      contentType: file.type,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    })

    const imageURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      imagePATH,
    )}?alt=media&token=${downloadToken}`
    return NextResponse.json({ success: true, imagePATH, imageURL }, { status: 201 })
  } catch (error) {
    logger.error('ad creative upload failed', { error, uid })
    return jsonApiError(500, 'INTERNAL_ERROR', "Échec de l'upload de l'image.")
  }
}
