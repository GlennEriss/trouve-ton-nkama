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

/**
 * Sélectionne UNE campagne active éligible pour un emplacement donné.
 * Requête simple (égalité + array-contains) puis filtrage date/ciblage en mémoire
 * pour éviter les index composites — volume faible attendu en V1.
 */
export async function getActiveCampaignForPlacement(
  placement: AdPlacement,
  ctx: AdServeContext = {},
): Promise<AdCreativePublic | null> {
  try {
    const [{ adminApp }, { getFirestore }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ])
    if (!adminApp) {
      logger.error('Firebase admin non initialisé')
      return null
    }

    const db = getFirestore(adminApp as any)
    const snapshot = await db
      .collection(firebaseCollectionNames.ad_campaigns)
      .where('status', '==', 'active')
      .where('placements', 'array-contains', placement)
      .get()

    const now = Date.now()
    const eligible = snapshot.docs
      .map((doc) => ({ ...(doc.data() as AdCampaign), id: doc.id }))
      .filter((c) => toMillis(c.startDate) <= now && toMillis(c.endDate) >= now)
      .filter((c) => matchesTargeting(c, ctx))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    if (eligible.length === 0) return null

    // Rotation simple parmi les campagnes de plus forte priorité.
    const topPriority = eligible[0].priority ?? 0
    const top = eligible.filter((c) => (c.priority ?? 0) === topPriority)
    const chosen = top[Math.floor(Math.random() * top.length)]

    return {
      campaignId: chosen.id,
      placement,
      imageURL: chosen.creative?.imageURL ?? '',
      headline: chosen.creative?.headline,
      body: chosen.creative?.body,
      ctaLabel: chosen.creative?.ctaLabel,
      ctaUrl: chosen.creative?.ctaUrl,
    }
  } catch (error) {
    logger.error('getActiveCampaignForPlacement failed', { error, placement })
    return null
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
