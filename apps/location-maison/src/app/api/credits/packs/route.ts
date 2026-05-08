/**
 * Route API pour charger dynamiquement les packs de crédits.
 * Source: collection Firestore "credit_packs" (gérée par le dashboard admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { type CreditPackData } from '@/lib/credits/credit-packs'

const logger = createLogger('api.credits.packs')

interface CreditPacksResponse {
  success: boolean
  packs: CreditPackData[]
  source: 'firestore'
  message: string
  error?: string
}

type RawCreditPackDoc = {
  name?: unknown
  credits?: unknown
  price?: unknown
  savings?: unknown
  isActive?: unknown
  order?: unknown
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function mapPack(docId: string, data: RawCreditPackDoc): CreditPackData {
  const id = toTrimmedString(docId) ?? docId
  const name = toTrimmedString(data.name) ?? id
  const credits = Math.max(1, Math.trunc(toFiniteNumber(data.credits, 1)))
  const price = Math.max(0, Math.round(toFiniteNumber(data.price, 0)))
  const savingsRaw = toFiniteNumber(data.savings, Number.NaN)
  const savings = Number.isFinite(savingsRaw)
    ? Math.max(0, Math.min(99.99, savingsRaw))
    : undefined
  const order = Math.max(0, Math.trunc(toFiniteNumber(data.order, 0)))
  const isActive = typeof data.isActive === 'boolean' ? data.isActive : true

  return {
    id,
    name,
    credits,
    price,
    savings,
    isActive,
    order,
  }
}

function sortPacks(packs: CreditPackData[]) {
  return [...packs].sort((left, right) => {
    const leftOrder = left.order ?? 0
    const rightOrder = right.order ?? 0
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }
    if (left.credits !== right.credits) {
      return left.credits - right.credits
    }
    return left.price - right.price
  })
}

function activePacks(packs: CreditPackData[]): {
  packs: CreditPackData[]
  source: 'firestore'
} {
  const active = packs.filter((pack) => pack.isActive !== false)
  return {
    packs: sortPacks(active),
    source: 'firestore',
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<CreditPacksResponse>> {
  try {
    const [{ adminAuth }, { getFirestore }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ])

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          packs: [],
          source: 'firestore',
          message: "Token d'authentification requis",
        },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    await adminAuth.verifyIdToken(token)

    const db = getFirestore()
    const snapshot = await db.collection('credit_packs').get()
    const mapped = snapshot.docs.map((doc) => mapPack(doc.id, doc.data() as RawCreditPackDoc))
    const result = activePacks(mapped)

    return NextResponse.json({
      success: true,
      packs: result.packs,
      source: result.source,
      message:
        result.packs.length > 0
          ? 'Packs chargés depuis la configuration admin'
          : 'Aucun pack actif configuré côté admin',
    })
  } catch (error: any) {
    logger.error('Credit packs API failed', { error })

    return NextResponse.json(
      {
        success: false,
        packs: [],
        source: 'firestore',
        message: 'Impossible de charger les packs dynamiques',
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}
