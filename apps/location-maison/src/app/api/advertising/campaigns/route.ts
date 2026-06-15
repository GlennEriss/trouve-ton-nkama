import { NextResponse } from 'next/server'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'

import firebaseCollectionNames from '@/constantes/firebase-collection-name'
import { adminApp } from '@/firebase/admin'
import { auth } from '@/next-auth/auth'
import { createLogger } from '@/lib/logger'
import { getAdPackage } from '@/constantes/ad-packages'
import type { AdCampaign } from '@/models/advertising'

const logger = createLogger('api.advertising.campaigns')

const SELF_SERVE_PRIORITY = 5 // < campagnes concierge (10) en cas d'égalité

function parseTargeting(value: unknown): { provinces?: string[]; cities?: string[] } | null {
  if (!value || typeof value !== 'object') return null
  const v = value as { provinces?: unknown; cities?: unknown }
  const provinces = Array.isArray(v.provinces) ? v.provinces.filter((x) => typeof x === 'string') : undefined
  const cities = Array.isArray(v.cities) ? v.cities.filter((x) => typeof x === 'string') : undefined
  if (!provinces?.length && !cities?.length) return null
  return { ...(provinces?.length ? { provinces } : {}), ...(cities?.length ? { cities } : {}) }
}

/** Crée une campagne self-serve : débit crédits + mise en ligne immédiate. */
export async function POST(request: Request) {
  try {
    const session = await auth()
    const uid = session?.user?.uid
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 })
    }
    if (!adminApp) {
      return NextResponse.json({ success: false, message: 'Firebase admin non initialisé.' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const pkg = getAdPackage(typeof body.packageId === 'string' ? body.packageId : '')
    const creative = body.creative ?? {}
    const imageURL = typeof creative.imageURL === 'string' ? creative.imageURL.trim() : ''

    if (!pkg) {
      return NextResponse.json({ success: false, message: 'Forfait invalide.' }, { status: 400 })
    }
    if (!imageURL) {
      return NextResponse.json({ success: false, message: 'Visuel de la publicité requis.' }, { status: 400 })
    }

    const db = getFirestore(adminApp)
    const usersQuery = await db
      .collection(firebaseCollectionNames.users)
      .where('uid', '==', uid)
      .limit(1)
      .get()
    if (usersQuery.empty) {
      return NextResponse.json({ success: false, message: 'Utilisateur introuvable.' }, { status: 404 })
    }
    const userRef = usersQuery.docs[0].ref
    const campaignRef = db.collection(firebaseCollectionNames.ad_campaigns).doc()
    const transactionRef = db.collection(firebaseCollectionNames.credit_transactions).doc()

    const result = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef)
      const user = userSnap.data() ?? {}
      const credits = Number(user.credits ?? 0)
      if (credits < pkg.credits) {
        throw new Error(`INSUFFICIENT_CREDITS:${credits}`)
      }

      const now = Timestamp.now()
      const endDate = Timestamp.fromMillis(now.toMillis() + pkg.durationDays * 24 * 60 * 60 * 1000)
      const nextCredits = credits - pkg.credits

      const campaign = {
        advertiserId: null,
        createdBy: uid,
        title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : (creative.headline || 'Publicité'),
        creative: {
          imagePATH: typeof creative.imagePATH === 'string' ? creative.imagePATH : '',
          imageURL,
          headline: typeof creative.headline === 'string' ? creative.headline : '',
          ctaUrl: typeof creative.ctaUrl === 'string' ? creative.ctaUrl : '',
        },
        placements: pkg.placements,
        targeting: parseTargeting(body.targeting),
        startDate: now,
        endDate,
        status: 'active' as AdCampaign['status'],
        priority: SELF_SERVE_PRIORITY,
        billing: {
          mode: 'user_credits',
          paymentStatus: 'paid',
          creditsUsed: pkg.credits,
          currency: 'XAF',
          paidAt: now,
        },
        metrics: { impressions: 0, clicks: 0 },
        createdAt: now,
        updatedAt: now,
      }

      tx.update(userRef, { credits: nextCredits, updatedAt: now })
      tx.set(campaignRef, campaign)
      tx.set(transactionRef, {
        uid,
        type: 'spend',
        credits: -Math.abs(pkg.credits),
        service: `Publicité - ${pkg.name}`,
        campaignId: campaignRef.id,
        description: `Forfait pub "${pkg.name}" (${pkg.durationDays} j)`,
        status: 'success',
        createdAt: now,
        updatedAt: now,
      })

      return { nextCredits }
    })

    return NextResponse.json({
      success: true,
      campaignId: campaignRef.id,
      creditsUsed: pkg.credits,
      creditsRemaining: result.nextCredits,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    if (message.startsWith('INSUFFICIENT_CREDITS')) {
      const available = Number(message.split(':')[1] ?? 0)
      return NextResponse.json(
        { success: false, code: 'INSUFFICIENT_CREDITS', message: `Crédits insuffisants. Vous avez ${available} crédits.` },
        { status: 402 },
      )
    }
    logger.error('Self-serve campaign creation failed', { error })
    return NextResponse.json({ success: false, message: 'Création de la campagne impossible.' }, { status: 500 })
  }
}

/** Liste les campagnes de l'utilisateur connecté. */
export async function GET() {
  try {
    const session = await auth()
    const uid = session?.user?.uid
    if (!uid) {
      return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 })
    }
    if (!adminApp) {
      return NextResponse.json({ success: false, message: 'Firebase admin non initialisé.' }, { status: 500 })
    }

    const db = getFirestore(adminApp)
    const snap = await db
      .collection(firebaseCollectionNames.ad_campaigns)
      .where('createdBy', '==', uid)
      .get()

    const toIso = (v: any) =>
      v?.toMillis ? new Date(v.toMillis()).toISOString() : v?.seconds ? new Date(v.seconds * 1000).toISOString() : null

    const campaigns = snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          title: data.title ?? '',
          status: data.status ?? 'draft',
          placements: data.placements ?? [],
          imageURL: data.creative?.imageURL ?? '',
          startDate: toIso(data.startDate),
          endDate: toIso(data.endDate),
          metrics: { impressions: data.metrics?.impressions ?? 0, clicks: data.metrics?.clicks ?? 0 },
          creditsUsed: data.billing?.creditsUsed ?? 0,
          createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0,
        }
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs)

    return NextResponse.json({ success: true, campaigns })
  } catch (error) {
    logger.error('Failed to list own campaigns', { error })
    return NextResponse.json({ success: false, message: 'Impossible de charger vos publicités.' }, { status: 500 })
  }
}
