import firebaseCollectionNames from '@/constantes/firebase-collection-name'
import { createLogger } from '@/lib/logger'
import { resolveAuthenticatedUid } from '@/lib/server/authenticated-uid'
import { getFirestore } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'

const logger = createLogger('api.credits.history')

type TransactionType = 'all' | 'purchase' | 'spend'

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object' && 'toDate' in value) {
    const converted = (value as { toDate: () => Date }).toDate()
    return converted.toISOString()
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }
  return null
}

function normalizeType(value: string | null): TransactionType {
  return value === 'purchase' || value === 'spend' ? value : 'all'
}

function transactionDescription(data: Record<string, unknown>): string {
  if (typeof data.description === 'string' && data.description.trim()) return data.description
  if (typeof data.service === 'string' && data.service.trim()) return data.service
  return Number(data.credits ?? 0) > 0 ? 'Achat de crédits' : 'Utilisation de crédits'
}

export async function GET(request: NextRequest) {
  try {
    const uid = await resolveAuthenticatedUid(request)
    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 },
      )
    }

    const type = normalizeType(request.nextUrl.searchParams.get('type'))
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 10)
    const pageLimit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 10))
    const cursor = request.nextUrl.searchParams.get('cursor')?.trim() ?? ''
    const db = getFirestore()
    const collection = db.collection(firebaseCollectionNames.credit_transactions)

    let historyQuery: FirebaseFirestore.Query = collection.where('uid', '==', uid)
    let countQuery: FirebaseFirestore.Query = collection.where('uid', '==', uid)
    if (type !== 'all') {
      historyQuery = historyQuery.where('type', '==', type)
      countQuery = countQuery.where('type', '==', type)
    }

    historyQuery = historyQuery.orderBy('createdAt', 'desc')
    if (cursor) {
      const cursorDocument = await collection.doc(cursor).get()
      if (cursorDocument.exists && cursorDocument.data()?.uid === uid) {
        historyQuery = historyQuery.startAfter(cursorDocument)
      }
    }

    const [historySnapshot, countSnapshot] = await Promise.all([
      historyQuery.limit(pageLimit + 1).get(),
      countQuery.count().get(),
    ])
    const pageDocuments = historySnapshot.docs.slice(0, pageLimit)
    const hasMore = historySnapshot.docs.length > pageLimit

    return NextResponse.json({
      success: true,
      transactions: pageDocuments.map((document) => {
        const data = document.data() as Record<string, unknown>
        const normalizedType = data.type === 'purchase' || data.type === 'spend'
          ? data.type
          : data.packId
            ? 'purchase'
            : 'spend'

        return {
          id: document.id,
          userId: uid,
          type: normalizedType,
          credits: Number(data.credits ?? 0),
          amount: typeof data.amount === 'number' ? data.amount : undefined,
          service: typeof data.service === 'string' ? data.service : undefined,
          status: typeof data.status === 'string' ? data.status : 'success',
          description: transactionDescription(data),
          propertyId: typeof data.propertyId === 'string' ? data.propertyId : undefined,
          createdAt: toIsoDate(data.createdAt),
          updatedAt: toIsoDate(data.updatedAt),
        }
      }),
      hasMore,
      nextCursor: hasMore ? pageDocuments.at(-1)?.id ?? null : null,
      total: countSnapshot.data().count,
    })
  } catch (error) {
    logger.error('Credit history API failed', { error })
    return NextResponse.json(
      { success: false, message: "Impossible de charger l'historique des crédits" },
      { status: 500 },
    )
  }
}
