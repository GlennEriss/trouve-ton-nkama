/**
 * @module lib/gifts
 *
 * Solde cadeaux d'un annonceur — SEULE source de vérité, dérivée à la lecture :
 *   disponible = max(0, net cumulé reçu − Σ retraits non refusés)
 * Un retrait EN_ATTENTE ou TRAITE débite le disponible ; un retrait REFUSE le
 * restitue. Rien n'est stocké/décrémenté, donc rien à garder cohérent.
 * (La future conversion cadeaux→crédits ne sera qu'un terme de plus ici.)
 */
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore'
import firebaseCollectionNames from '@/constantes/firebase-collection-name'
import { adminApp } from '@/firebase/admin'
import { computeGiftBalanceFromRows, type GiftBalance } from '@/lib/gifts/balance-calculator'

export type { GiftBalance } from '@/lib/gifts/balance-calculator'

const getDb = () => {
  if (!adminApp) {
    throw new Error('Firebase Admin not initialized')
  }
  return getAdminFirestore(adminApp as any)
}

export async function deriveGiftBalance(uid: string): Promise<GiftBalance> {
  const db = getDb()

  const [userQuery, withdrawalsSnap] = await Promise.all([
    db.collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1).get(),
    db.collection(firebaseCollectionNames.gift_withdrawals).where('announcerUid', '==', uid).get(),
  ])

  return computeGiftBalanceFromRows(
    userQuery.docs[0]?.data()?.giftTotalReceivedXaf,
    withdrawalsSnap.docs.map((doc) => doc.data()),
  )
}
