/**
 * Fonctions de base de données pour les transactions de crédits
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { CreditTransaction, CreditPack, CREDIT_PACKS } from './types'
import { generateTransactionId } from './config'

const db = getFirestore()

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
  const pack = getCreditPackById(packId)
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
export function getCreditPackById(packId: string): CreditPack | null {
  return CREDIT_PACKS.find(pack => pack.id === packId) || null
}

/**
 * Récupère tous les packs de crédits disponibles
 */
export function getAllCreditPacks(): CreditPack[] {
  return CREDIT_PACKS
} 