/* eslint-disable no-console */

/**
 * Remplace par des JPEG les images WebP des imports Emilie Shop et logements.
 * `next/og` accepte les JPEG distants, mais échoue sur ces WebP dans le runtime
 * Vercel. Les anciens fichiers restent dans Storage pour permettre un rollback.
 *
 * Usage :
 *   node scripts/repair-imported-og-images.js          # dry-run
 *   node scripts/repair-imported-og-images.js --apply  # production
 */

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const sharp = require('sharp')

const APPLY = process.argv.includes('--apply')
const PROD_PROJECT_ID = 'location-maison-prod-167da'
const REPAIR_SOURCE = 'og-jpeg-repair-2026-09-21'
const IMPORTS_ROOT = path.resolve(__dirname, '../../../imports')

const HOUSING_IMAGE_NAMES = {
  '01': ['01.png'],
  '02': [
    'image copy 6.png',
    'image copy.png',
    'image copy 2.png',
    'image copy 5.png',
    'image copy 4.png',
    'image copy 3.png',
    '03.png',
    'image copy 7.png',
    'image copy 8.png',
    'image.png',
  ],
  '03': ['image copy.png', 'image.png'],
  '04': ['image.png'],
}

function buildPlan() {
  const emilie = Array.from({ length: 17 }, (_, index) => {
    const sequence = String(index + 1).padStart(2, '0')
    return {
      propertyId: `emilie-shop-20260918-${sequence}`,
      sourcePaths: [path.join(IMPORTS_ROOT, 'emilie-shop/images', `${index + 1}.png`)],
    }
  })

  const housing = Object.entries(HOUSING_IMAGE_NAMES).map(([sequence, names]) => ({
    propertyId: `platform-housing-20260918-${sequence}`,
    sourcePaths: names.map((name) =>
      path.join(IMPORTS_ROOT, 'platform-announcers-housing/images', sequence, name),
    ),
  }))

  return [...emilie, ...housing]
}

function firebaseDownloadUrl(bucketName, storagePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`
}

async function encodeJpeg(sourcePath) {
  const [main, thumb] = await Promise.all([
    sharp(sourcePath)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer(),
    sharp(sourcePath)
      .rotate()
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer(),
  ])
  return { main, thumb }
}

async function uploadJpeg(bucket, ownerUid, propertyId, sourcePath, index) {
  const sequence = String(index + 1).padStart(2, '0')
  const filePATH = `property/${propertyId}/og_${sequence}.jpg`
  const thumbPATH = `property/${propertyId}/thumb_og_${sequence}.jpg`
  const mainToken = crypto.randomUUID()
  const thumbToken = crypto.randomUUID()
  const { main, thumb } = await encodeJpeg(sourcePath)
  const metadata = (token) => ({
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000, immutable',
    metadata: {
      owner: ownerUid,
      status: 'InProgress',
      repairSource: REPAIR_SOURCE,
      firebaseStorageDownloadTokens: token,
    },
  })

  await Promise.all([
    bucket.file(filePATH).save(main, { resumable: false, metadata: metadata(mainToken) }),
    bucket.file(thumbPATH).save(thumb, { resumable: false, metadata: metadata(thumbToken) }),
  ])

  return {
    image: {
      filePATH,
      fileURL: firebaseDownloadUrl(bucket.name, filePATH, mainToken),
      thumbPATH,
      thumbURL: firebaseDownloadUrl(bucket.name, thumbPATH, thumbToken),
    },
    uploadedPaths: [filePATH, thumbPATH],
  }
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, '..', '.env.local.prod')
  const { initFirestoreAdmin } = require('./openstreetmap/firestore-admin')
  const { admin, db } = initFirestoreAdmin()

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet Firebase « ${process.env.FIREBASE_PROJECT_ID} », attendu « ${PROD_PROJECT_ID} ».`)
  }

  const plan = buildPlan()
  const allPaths = plan.flatMap((item) => item.sourcePaths)
  const missing = allPaths.filter((sourcePath) => !fs.existsSync(sourcePath))
  if (missing.length) throw new Error(`Images locales manquantes : ${missing.join(', ')}`)
  if (plan.length !== 21 || allPaths.length !== 31) {
    throw new Error(`Lot inattendu : ${plan.length}/21 annonces et ${allPaths.length}/31 images.`)
  }

  const documents = await db.getAll(...plan.map((item) => db.collection('properties').doc(item.propertyId)))
  const resolved = plan.map((item, index) => {
    const snapshot = documents[index]
    if (!snapshot.exists) throw new Error(`Annonce introuvable : ${item.propertyId}`)
    const data = snapshot.data()
    const alreadyRepaired =
      data.ogImageRepairSource === REPAIR_SOURCE &&
      Array.isArray(data.images) &&
      data.images.length === item.sourcePaths.length &&
      data.images.every((image) => typeof image?.fileURL === 'string' && image.fileURL.includes('.jpg'))
    return { ...item, ref: snapshot.ref, data, alreadyRepaired }
  })

  console.log(`Projet : ${PROD_PROJECT_ID}`)
  console.log(APPLY ? 'Mode : APPLY' : 'Mode : DRY-RUN')
  for (const item of resolved) {
    console.log(
      `- ${item.propertyId} — ${item.sourcePaths.length} image(s) — ${item.alreadyRepaired ? 'DÉJÀ RÉPARÉE' : 'À RÉPARER'}`,
    )
  }

  const pending = resolved.filter((item) => !item.alreadyRepaired)
  console.log(`Bilan : ${pending.length} à réparer, ${resolved.length - pending.length} déjà réparée(s).`)
  if (!APPLY) return

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucketName) throw new Error('Bucket Firebase Storage introuvable.')
  const bucket = admin.storage().bucket(bucketName)

  for (const item of pending) {
    const ownerUid = item.data.createdBy
    if (!ownerUid) throw new Error(`createdBy absent sur ${item.propertyId}`)
    const images = []
    const uploadedPaths = []
    try {
      for (let index = 0; index < item.sourcePaths.length; index += 1) {
        const uploaded = await uploadJpeg(bucket, ownerUid, item.propertyId, item.sourcePaths[index], index)
        images.push(uploaded.image)
        uploadedPaths.push(...uploaded.uploadedPaths)
      }
      await item.ref.update({
        images,
        ogImageRepairSource: REPAIR_SOURCE,
        ogImageRepairedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log(`✓ ${item.propertyId} — ${images.length} JPEG`)
    } catch (error) {
      await Promise.all(uploadedPaths.map((storagePath) => bucket.file(storagePath).delete({ ignoreNotFound: true })))
      throw new Error(`Échec ${item.propertyId}, nouveaux fichiers nettoyés : ${error.message}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
