/* eslint-disable no-console */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const sharp = require('sharp')

const APPLY = process.argv.includes('--apply')
const PROJECT_ID = 'location-maison-prod-167da'
const SOURCE = 'direct-housing-batch-2026-10-09'
const ROOT = path.resolve(__dirname, '../../../imports/direct-housing-2026-10-08-batch-02/images')
const TARGET_NAME = 'estelle moussavou'
const LIBREVILLE = { city: 'Libreville', province: 'Estuaire', latitude: 0.4162, longitude: 9.4673 }

const CATALOG = [
  { sequence: '01', title: 'Chambre américaine derrière le marché du Premier Campement', description: 'Chambre américaine située derrière le marché du Premier Campement, sur une route pavée. Elle comprend une chambre, une cuisine et une douche avec WC. Le loyer est de 100 000 FCFA, toutes charges comprises.', price: 100000, typeProperty: 'Room', categoryId: 'room', street: 'Derrière le marché du Premier Campement', contact: '+24166941442', additionalContacts: ['+24177737339'], details: { nbrRooms: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 } },
  { sequence: '02', title: 'Studio en dur à louer au quartier Fatima', description: 'Studio en dur comprenant une chambre, un salon, une cuisine et une douche. Situé au quartier Fatima à Port-Gentil. Conditions : un mois de loyer et un mois de caution. Les charges ne sont pas comprises.', price: 180000, typeProperty: 'Apartment', categoryId: 'apartment', street: 'Quartier Fatima', city: 'Port-Gentil', province: 'Ogooué-Maritime', latitude: -0.7193, longitude: 8.7815, contact: '+24166622194', details: { nbrRooms: 1, nbrLivingRoom: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 } },
  { sequence: '03', title: 'Maison spacieuse de 2 chambres à Libreville', description: 'Maison spacieuse entièrement carrelée avec deux grandes chambres, un salon, une grande cuisine, une douche avec WC intérieurs, une terrasse et des baies vitrées. Eau et électricité disponibles en permanence, sauf coupure de la SEEG. Visite : 5 000 FCFA. Loyer charges comprises.', price: 250000, typeProperty: 'Home', categoryId: 'home', street: 'Libreville', contact: '+24174355717', additionalContacts: ['+24176235546'], details: { nbrRooms: 2, nbrLivingRoom: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 } },
  { sequence: '04', title: 'Chambre simple à louer au PK9', description: 'Chambre simple à louer au PK9 avec douche et WC externes dans la barrière. Une cuve et un surpresseur sont disponibles en raison des difficultés d’approvisionnement en eau. Eau et électricité comprises dans le loyer.', price: 70000, typeProperty: 'Room', categoryId: 'room', street: 'PK9', contact: '+24176407555', details: { nbrRooms: 1, nbrKitchens: 0, nbrBathrooms: 1, nbrToilets: 1 } },
  { sequence: '06', title: 'Studio sécurisé avec cuisine américaine au PK12', description: 'Studio accessible en véhicule par une voie secondaire, dans une concession clôturée et sécurisée au PK12. Il comprend une terrasse avant, une grille de sécurité, un salon avec cuisine américaine et placards, une grande chambre avec placard et une salle de bain. Eau disponible 24h/24 et compteur électrique individuel. Caution : 140 000 FCFA. La charge d’eau est comprise. Aucun frais supplémentaire.', price: 140000, typeProperty: 'Apartment', categoryId: 'apartment', street: 'PK12', contact: '+24162878630', details: { nbrRooms: 1, nbrLivingRoom: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 } },
  { sequence: '07', title: 'Appartement neuf de 3 chambres à Libreville', description: 'Appartement neuf, propre et disponible immédiatement, situé au premier étage dans un bâtiment sécurisé par une grille. Il comprend trois chambres, trois douches avec WC, un salon, une salle à manger et une cuisine. Surpresseur d’eau et électricité disponibles.', price: 300000, typeProperty: 'Apartment', categoryId: 'apartment', street: 'Libreville', contact: '+24177727210', details: { nbrRooms: 3, nbrLivingRoom: 1, nbrKitchens: 1, nbrBathrooms: 3, nbrToilets: 3, nbrFloors: 1 } },
  { sequence: '08', title: 'Maison neuve de 2 chambres à Sametone', description: 'Maison neuve située à Sametone, à Owendo, au portail des anciennes pompes. Elle comprend deux chambres, deux douches, une cuisine américaine et une grande terrasse. Le loyer est proposé avec charges comprises. Conditions : un mois de loyer et un mois de caution.', price: 180000, typeProperty: 'Home', categoryId: 'home', street: 'Sametone, portail des anciennes pompes', city: 'Owendo', contact: '+24166528738', additionalContacts: ['+24177029459'], details: { nbrRooms: 2, nbrKitchens: 1, nbrBathrooms: 2, nbrToilets: 2 } },
  { sequence: '09', title: 'Chambre à louer après l’échangeur de Nzeng-Ayong', description: 'Chambre disponible à Nzeng-Ayong, après l’échangeur en direction de JP. La douche et les WC sont communs dans le couloir, à raison de deux personnes par douche. Une seule chambre est disponible. Eau et électricité comprises.', price: 65000, typeProperty: 'Room', categoryId: 'room', street: 'Nzeng-Ayong, après l’échangeur vers JP', contact: '+24174313270', details: { nbrRooms: 1, nbrKitchens: 0, nbrBathrooms: 0, nbrToilets: 0 } },
  { sequence: '10', title: 'Chambre avec cuisine et douche intérieure à Razel', description: 'Chambre à louer avec coin cuisine et douche intérieure, située à Razel après l’hôtel Sossa. Le loyer est de 95 000 FCFA, charges comprises.', price: 95000, typeProperty: 'Room', categoryId: 'room', street: 'Razel, après l’hôtel Sossa', contact: '+24166723867', additionalContacts: ['+24174330563'], details: { nbrRooms: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 } },
]

const normalize = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
const url = (bucket, name, token) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(name)}?alt=media&token=${token}`
const userNames = (d) => [d.pseudo, d.displayName, [d.firstname, d.lastname].filter(Boolean).join(' '), [d.firstName, d.lastName].filter(Boolean).join(' ')].filter(Boolean)

function imagePlan() {
  const map = new Map()
  const hashes = new Set()
  for (const item of CATALOG) {
    let files = fs.readdirSync(path.join(ROOT, item.sequence)).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort()
    if (item.sequence === '07') files = files.filter((name) => name !== '08.png')
    if (!files.length || files.length > 10) throw new Error(`Nombre d’images invalide pour ${item.sequence}: ${files.length}`)
    const paths = files.map((name) => path.join(ROOT, item.sequence, name))
    for (const source of paths) {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')
      if (hashes.has(hash)) throw new Error(`Image dupliquée : ${source}`)
      hashes.add(hash)
    }
    map.set(item.sequence, paths)
  }
  if ([...map.values()].flat().length !== 46) throw new Error('Le lot doit contenir 46 images sélectionnées.')
  return map
}

async function targetUser(db) {
  const users = await db.collection('users').get()
  const matches = users.docs.filter((doc) => userNames(doc.data()).some((name) => normalize(name) === TARGET_NAME))
  if (matches.length !== 1) throw new Error(`Estelle Moussavou : ${matches.length} correspondance(s).`)
  if (matches[0].data().isPlatformAnnouncer !== true) throw new Error('Estelle Moussavou n’est pas un annonceur plateforme.')
  return matches[0]
}

async function upload(bucket, uid, propertyId, source, index) {
  const n = String(index + 1).padStart(2, '0'), filePATH = `property/${propertyId}/og_${n}.jpg`, thumbPATH = `property/${propertyId}/thumb_og_${n}.jpg`
  const fileToken = crypto.randomUUID(), thumbToken = crypto.randomUUID()
  const [main, thumb] = await Promise.all([
    sharp(source).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: 88, progressive: true }).toBuffer(),
    sharp(source).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: 82, progressive: true }).toBuffer(),
  ])
  const metadata = (token) => ({ contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable', metadata: { owner: uid, status: 'InProgress', firebaseStorageDownloadTokens: token } })
  await Promise.all([bucket.file(filePATH).save(main, { resumable: false, metadata: metadata(fileToken) }), bucket.file(thumbPATH).save(thumb, { resumable: false, metadata: metadata(thumbToken) })])
  return { image: { filePATH, fileURL: url(bucket.name, filePATH, fileToken), thumbPATH, thumbURL: url(bucket.name, thumbPATH, thumbToken) }, paths: [filePATH, thumbPATH] }
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH ||= path.join(__dirname, '..', '.env.local.prod')
  const { initFirestoreAdmin } = require('./openstreetmap/firestore-admin')
  const { admin, db } = initFirestoreAdmin()
  if (process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) throw new Error(`Projet refusé : ${process.env.FIREBASE_PROJECT_ID}`)
  const images = imagePlan()
  const [user, rootDoc, roomDoc, homeDoc, apartmentDoc] = await Promise.all([targetUser(db), ...['immobilier', 'room', 'home', 'apartment'].map((id) => db.collection('listing_categories').doc(id).get())])
  if (![rootDoc, roomDoc, homeDoc, apartmentDoc].every((doc) => doc.exists)) throw new Error('Une catégorie requise est absente.')
  const rootName = rootDoc.data().name || 'Immobilier'
  const categoryNames = { room: roomDoc.data().name || 'Chambre', home: homeDoc.data().name || 'Maison', apartment: apartmentDoc.data().name || 'Appartement' }
  const plan = await Promise.all(CATALOG.map(async (item) => { const propertyId = `${SOURCE}-${item.sequence}`; const doc = await db.collection('properties').doc(propertyId).get(); return { ...item, propertyId, imagePaths: images.get(item.sequence), exists: doc.exists } }))
  console.log(`Projet : ${PROJECT_ID}\nMode : ${APPLY ? 'APPLY' : 'DRY-RUN'}\nCompte : Estelle Moussavou (${user.id})`)
  plan.forEach((p) => console.log(`- ${p.propertyId} ${p.exists ? '[EXISTE]' : '[À CRÉER]'} — ${p.price} FCFA — ${p.imagePaths.length} JPEG — isOwner=true`))
  if (!APPLY) return console.log('Dry-run terminé : aucune écriture.')
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucketName) throw new Error('Bucket production absent.')
  const bucket = admin.storage().bucket(bucketName)
  for (const item of plan.filter((p) => !p.exists)) {
    const stored = [], uploadedImages = []
    try {
      for (let i = 0; i < item.imagePaths.length; i += 1) { const result = await upload(bucket, user.id, item.propertyId, item.imagePaths[i], i); uploadedImages.push(result.image); stored.push(...result.paths) }
      const location = { ...LIBREVILLE, ...(item.city ? { city: item.city } : {}), ...(item.province ? { province: item.province } : {}), ...(item.latitude ? { latitude: item.latitude } : {}), ...(item.longitude ? { longitude: item.longitude } : {}) }
      await db.collection('properties').doc(item.propertyId).create({ title: item.title, description: item.description, price: item.price, area: 0, images: uploadedImages, typeProperty: item.typeProperty, status: 'FOR_RENT', categoryId: item.categoryId, categoryPath: { lvl0: rootName, lvl1: `${rootName} > ${categoryNames[item.categoryId]}` }, attributes: {}, ...item.details, street: item.street, ...location, country: 'Gabon', countryCode: 'GA', isLocExact: false, locationSource: 'UNVERIFIED', contact: item.contact, whatsappContact: '', callContact: '', additionalContacts: item.additionalContacts || [], isOwner: true, createdBy: user.id, ownerUids: [user.id], searchableName: normalize(item.title), moderationStatus: 'APPROVED', moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(), moderationReviewedBy: `import:${SOURCE}`, rejectionReason: null, state: 'IN_PROGRESS', tags: [], importSource: SOURCE, importSourceId: item.propertyId, ogImageRepairSource: 'jpeg-at-import', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      console.log(`✓ ${item.propertyId}`)
    } catch (error) { await Promise.all(stored.map((name) => bucket.file(name).delete({ ignoreNotFound: true }))); throw new Error(`Échec ${item.propertyId}, fichiers nettoyés : ${error.message}`) }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
