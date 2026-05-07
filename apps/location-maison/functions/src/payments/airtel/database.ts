/**
 * Fonctions de base de données pour les transactions de crédits
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { CreditTransaction, CreditPack } from './types'
import { generateTransactionId } from './config'

const db = getFirestore()
const CREDIT_PACKS_COLLECTION = 'credit_packs'

type RawCreditPackDoc = {
  name?: unknown
  credits?: unknown
  price?: unknown
  savings?: unknown
  isActive?: unknown
  order?: unknown
}

const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 2000,
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 10,
    price: 3500,
    savings: 12.5,
  },
  {
    id: 'advanced',
    name: 'Avancé',
    credits: 25,
    price: 7500,
    savings: 25,
  },
  {
    id: 'premium',
    name: 'Premium',
    credits: 50,
    price: 12500,
    savings: 37.5,
  },
]

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

function mapCreditPack(docId: string, data: RawCreditPackDoc): CreditPack {
  const id = toTrimmedString(docId) ?? docId
  const name = toTrimmedString(data.name) ?? id
  const credits = Math.max(1, Math.trunc(toFiniteNumber(data.credits, 1)))
  const price = Math.max(0, Math.round(toFiniteNumber(data.price, 0)))
  const savingsRaw = toFiniteNumber(data.savings, Number.NaN)
  const savings =
    Number.isFinite(savingsRaw) && savingsRaw > 0 ? Math.max(0, Math.min(99.99, savingsRaw)) : undefined

  return {
    id,
    name,
    credits,
    price,
    savings,
  }
}

async function loadActiveCreditPacks(): Promise<CreditPack[]> {
  const snapshot = await db.collection(CREDIT_PACKS_COLLECTION).orderBy('order', 'asc').get()
  const packs = snapshot.docs
    .map((doc) => {
      const data = doc.data() as RawCreditPackDoc
      const isActive = typeof data.isActive === 'boolean' ? data.isActive : true
      if (!isActive) {
        return null
      }
      return mapCreditPack(doc.id, data)
    })
    .filter((item): item is CreditPack => Boolean(item))

  if (packs.length === 0) {
    return [...DEFAULT_CREDIT_PACKS]
  }

  return packs
}

/**
 * Trouve un document utilisateur par UID
 */
async function findUserDocumentByUID(userId: string) {
  const usersSnapshot = await db
    .collection('users')
    .where('uid', '==', userId)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    return null
  }

  return usersSnapshot.docs[0]
}

/**
 * Crée une nouvelle transaction de crédit
 */
export async function createCreditTransaction(
  userId: string,
  packId: string,
  phoneNumber?: string
): Promise<CreditTransaction> {
  const pack = await getCreditPackById(packId)
  if (!pack) {
    throw new Error(`Pack de crédits introuvable: ${packId}`)
  }

  const transactionId = generateTransactionId()
  const now = new Date()

  const transaction: CreditTransaction = {
    id: transactionId,
    uid:userId,
    type: 'purchase',
    packId,
    credits: pack.credits,
    amount: pack.price,
    status: 'pending',
    provider: 'airtel_money',
    description: `Achat ${pack.name}`,
    phoneNumber,
    createdAt: now,
    updatedAt: now
  }

  // Sauvegarder dans Firestore
  await db.collection('credit_transactions').doc(transactionId).set({
    ...transaction,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  })

  return transaction
}

/**
 * Met à jour une transaction de crédit
 */
export async function updateCreditTransaction(
  transactionId: string,
  updates: Partial<CreditTransaction>
): Promise<void> {
  const updateData: any = {
    ...updates,
    updatedAt: FieldValue.serverTimestamp()
  }

  if (updates.status === 'success') {
    updateData.completedAt = FieldValue.serverTimestamp()
  }

  await db.collection('credit_transactions').doc(transactionId).update(updateData)
}

/**
 * Récupère une transaction par ID
 */
export async function getCreditTransaction(transactionId: string): Promise<CreditTransaction | null> {
  const doc = await db.collection('credit_transactions').doc(transactionId).get()
  
  if (!doc.exists) {
    return null
  }

  const data = doc.data()!
  return {
    ...data,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
    completedAt: data.completedAt?.toDate()
  } as CreditTransaction
}

/**
 * Ajoute des crédits au solde d'un utilisateur (transaction atomique)
 */
export async function addCreditsToUser(
  userId: string,
  credits: number,
  transactionId: string
): Promise<void> {
  await db.runTransaction(async (transaction) => {
    // Trouver le document utilisateur par UID
    const userDoc = await findUserDocumentByUID(userId)
    
    if (!userDoc) {
      throw new Error(`Utilisateur introuvable: ${userId}`)
    }

    const currentCredits = userDoc.data()?.credits ?? 0
    const newCredits = currentCredits + credits

    // Mettre à jour le solde utilisateur
    transaction.update(userDoc.ref, {
      credits: newCredits,
      updatedAt: FieldValue.serverTimestamp()
    })

    // Marquer la transaction comme réussie
    transaction.update(
      db.collection('credit_transactions').doc(transactionId),
      {
        status: 'success',
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }
    )
  })
}

/**
 * Récupère le solde de crédits d'un utilisateur
 */
export async function getUserCredits(userId: string): Promise<number> {
  const userDoc = await findUserDocumentByUID(userId)
  
  if (!userDoc) {
    return 0
  }

  return userDoc.data()?.credits ?? 0
}

/**
 * Crée ou met à jour le document utilisateur avec des crédits
 */
export async function createOrUpdateUserCredits(
  userId: string, 
  credits: number = 3
): Promise<void> {
  const userDoc = await findUserDocumentByUID(userId)
  
  if (!userDoc) {
    // L'utilisateur n'existe pas, on ne peut pas le créer ici
    // car on n'a pas toutes les informations nécessaires
    throw new Error(`Utilisateur introuvable: ${userId}`)
  }

  // Mettre à jour seulement si le champ credits n'existe pas
  const userData = userDoc.data()
  if (typeof userData?.credits === 'undefined') {
    await userDoc.ref.update({
      credits,
      updatedAt: FieldValue.serverTimestamp()
    })
  }
}

/**
 * Récupère les transactions d'un utilisateur
 */
export async function getUserTransactions(
  userId: string,
  limit: number = 20,
  startAfter?: any
): Promise<CreditTransaction[]> {
  let query = db
    .collection('credit_transactions')
    .where('uid', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)

  if (startAfter) {
    query = query.startAfter(startAfter)
  }

  const snapshot = await query.get()
  
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
      completedAt: data.completedAt?.toDate()
    } as CreditTransaction
  })
}

/**
 * Récupère un pack de crédits par ID
 */
export async function getCreditPackById(packId: string): Promise<CreditPack | null> {
  const packs = await loadActiveCreditPacks()
  const normalized = packId.trim().toLowerCase()
  return packs.find(pack => pack.id.trim().toLowerCase() === normalized) ?? null
}

/**
 * Récupère tous les packs de crédits disponibles
 */
export async function getAllCreditPacks(): Promise<CreditPack[]> {
  return loadActiveCreditPacks()
}
