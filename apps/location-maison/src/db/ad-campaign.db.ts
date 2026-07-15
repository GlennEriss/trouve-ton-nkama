/**
 * Accès serveur (Firebase Admin) aux campagnes publicitaires.
 * Lecture publique de la campagne à servir + incrément des métriques.
 */

import firebaseCollectionNames from '@/constantes/firebase-collection-name'
import { createLogger } from '@/lib/logger'
import type {
  AdCampaign,
  AdCreativePublic,
  AdMetrics,
  AdPlacement,
} from '@/models/advertising'

const logger = createLogger('db.ad-campaign')

export interface AdServeContext {
  province?: string | null
  city?: string | null
}

function toMillis(value: unknown): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && value !== null) {
    const maybe = value as { toMillis?: () => number; seconds?: number }
    if (typeof maybe.toMillis === 'function') {
      try {
        return maybe.toMillis()
      } catch {
        return 0
      }
    }
    if (typeof maybe.seconds === 'number') return maybe.seconds * 1000
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

function matchesTargeting(campaign: AdCampaign, ctx: AdServeContext): boolean {
  const targeting = campaign.targeting
  if (!targeting) return true
  const { provinces, cities } = targeting
  if (provinces?.length && ctx.province && !provinces.includes(ctx.province)) {
    return false
  }
  if (cities?.length && ctx.city && !cities.includes(ctx.city)) {
    return false
  }
  return true
}

function toPublicCreative(campaign: AdCampaign, placement: AdPlacement): AdCreativePublic {
  // Visuel adapté à l'emplacement si fourni, sinon le visuel par défaut.
  const asset = campaign.creative?.assets?.[placement]
  const imageURL = asset?.imageURL || campaign.creative?.imageURL || undefined
  // Vidéo (reels_infeed uniquement) — même logique de repli que l'image.
  const videoURL = asset?.videoURL || campaign.creative?.videoURL || undefined

  return {
    campaignId: campaign.id,
    placement,
    imageURL,
    videoURL,
    headline: campaign.creative?.headline,
    body: campaign.creative?.body,
    ctaLabel: campaign.creative?.ctaLabel,
    ctaUrl: campaign.creative?.ctaUrl,
  }
}

function normalizeCounterSegment(value: string | null | undefined): string {
  if (!value) return 'all'

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'all'
}

function getCounterId(placement: AdPlacement, ctx: AdServeContext): string {
  return [
    placement,
    normalizeCounterSegment(ctx.province),
    normalizeCounterSegment(ctx.city),
  ].join('__')
}

async function getEligibleCampaigns(
  placement: AdPlacement,
  ctx: AdServeContext = {},
): Promise<AdCampaign[]> {
  const [{ adminApp }, { getFirestore }] = await Promise.all([
    import('@/firebase/admin'),
    import('firebase-admin/firestore'),
  ])
  if (!adminApp) {
    logger.error('Firebase admin non initialisé')
    return []
  }

  const db = getFirestore(adminApp as any)
  const snapshot = await db
    .collection(firebaseCollectionNames.ad_campaigns)
    .where('status', '==', 'active')
    .where('placements', 'array-contains', placement)
    .get()

  const now = Date.now()
  return snapshot.docs
    .map((doc) => ({ ...(doc.data() as AdCampaign), id: doc.id }))
    .filter((c) => toMillis(c.startDate) <= now && toMillis(c.endDate) >= now)
    .filter((c) => matchesTargeting(c, ctx))
    .sort((a, b) => {
      const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0)
      if (priorityDelta !== 0) return priorityDelta
      const createdDelta = toMillis(a.createdAt) - toMillis(b.createdAt)
      if (createdDelta !== 0) return createdDelta
      return String(a.id).localeCompare(String(b.id))
    })
}

async function getNextServingIndex(
  placement: AdPlacement,
  ctx: AdServeContext,
  totalCampaigns: number,
): Promise<number> {
  if (totalCampaigns <= 1) return 0

  const [{ adminApp }, { getFirestore, FieldValue }] = await Promise.all([
    import('@/firebase/admin'),
    import('firebase-admin/firestore'),
  ])
  if (!adminApp) return 0

  const db = getFirestore(adminApp as any)
  const counterRef = db
    .collection(firebaseCollectionNames.ad_serving_counters)
    .doc(getCounterId(placement, ctx))

  const currentCount = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(counterRef)
    const data = snapshot.exists ? snapshot.data() : null
    const count = typeof data?.count === 'number' ? data.count : 0

    tx.set(
      counterRef,
      {
        placement,
        province: ctx.province ?? null,
        city: ctx.city ?? null,
        count: count + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return count
  })

  return currentCount % totalCampaigns
}

/**
 * Sélectionne UNE campagne active éligible pour un emplacement donné.
 * Requête simple (égalité + array-contains) puis filtrage date/ciblage en mémoire
 * pour éviter les index composites — volume faible attendu en V1.
 *
 * La campagne servie n'est pas choisie au hasard : un compteur serveur atomique
 * par emplacement/contexte assure une rotation équitable entre les campagnes
 * éligibles. Avec 5 pubs actives, les 5 sortent à tour de rôle.
 */
export async function getActiveCampaignForPlacement(
  placement: AdPlacement,
  ctx: AdServeContext = {},
): Promise<AdCreativePublic | null> {
  try {
    const eligible = await getEligibleCampaigns(placement, ctx)

    if (eligible.length === 0) return null

    const index = await getNextServingIndex(placement, ctx, eligible.length)
    const chosen = eligible[index]

    return toPublicCreative(chosen, placement)
  } catch (error) {
    logger.error('getActiveCampaignForPlacement failed', { error, placement })
    return null
  }
}

/**
 * Renvoie toutes les campagnes actives éligibles pour un emplacement donné.
 * Utilisé par les surfaces qui sont de vrais sliders (ex: hero accueil), où
 * plusieurs campagnes doivent défiler au lieu de se masquer par priorité.
 */
export async function getActiveCampaignsForPlacement(
  placement: AdPlacement,
  ctx: AdServeContext = {},
): Promise<AdCreativePublic[]> {
  try {
    const eligible = await getEligibleCampaigns(placement, ctx)
    return eligible.map((campaign) => toPublicCreative(campaign, placement))
  } catch (error) {
    logger.error('getActiveCampaignsForPlacement failed', { error, placement })
    return []
  }
}

/** Incrémente un compteur de métrique (impression / clic). */
export async function incrementCampaignMetric(
  campaignId: string,
  metric: keyof AdMetrics,
): Promise<void> {
  try {
    const [{ adminApp }, { getFirestore, FieldValue }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ])
    if (!adminApp) return

    const db = getFirestore(adminApp as any)
    await db
      .collection(firebaseCollectionNames.ad_campaigns)
      .doc(campaignId)
      .set({ metrics: { [metric]: FieldValue.increment(1) } }, { merge: true })
  } catch (error) {
    logger.error('incrementCampaignMetric failed', { error, campaignId, metric })
  }
}
