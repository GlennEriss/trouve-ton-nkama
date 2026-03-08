/**
 * Webhook Airtel Money - Réception des notifications de paiement
 */

import { NextRequest, NextResponse } from 'next/server'

interface AirtelWebhookPayload {
  transaction: {
    airtel_money_id: string
    id: string  // Notre transaction ID
    message: string
    status: string  // SUCCESS, FAILED, PENDING, etc.
    amount: number
    currency: string
  }
  reference: string
  timestamp: string
  signature?: string
}

/**
 * Vérifie la signature du webhook (à implémenter en Phase 2)
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  // const expectedSignature = crypto.createHmac('sha256', process.env.AIRTEL_WEBHOOK_SECRET!)
  //   .update(payload)
  //   .digest('hex')
  // return signature === expectedSignature
  
  // Pour l'instant, on accepte tout (développement uniquement)
  return true
}

/**
 * Met à jour le solde utilisateur après paiement réussi
 */
async function addCreditsToUser(
  db: any,
  FieldValue: any,
  userId: string,
  credits: number,
  transactionId: string
) {
  // Trouver le document utilisateur par UID
  const usersSnapshot = await db
    .collection('users')
    .where('uid', '==', userId)
    .limit(1)
    .get()

  if (usersSnapshot.empty) {
    throw new Error(`Utilisateur introuvable: ${userId}`)
  }

  const userDoc = usersSnapshot.docs[0]
  const currentCredits = userDoc.data()?.credits ?? 0
  const newCredits = currentCredits + credits

  // Transaction atomique
  await db.runTransaction(async (transaction: any) => {
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const [{ adminApp }, { getFirestore, FieldValue }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ]);

    if (!adminApp) {
      return NextResponse.json(
        { error: 'Firebase admin is not initialized' },
        { status: 500 }
      );
    }

    const db = getFirestore(adminApp as any);

    console.log('🔔 Webhook Airtel Money reçu')
    
    const body = await request.text()
    const payload: AirtelWebhookPayload = JSON.parse(body)
    
    console.log('📄 Payload webhook:', payload)

    // Vérification de la signature (développement: désactivé)
    const signature = request.headers.get('x-airtel-signature') ?? ''
    if (!verifyWebhookSignature(body, signature)) {
      console.error('❌ Signature webhook invalide')
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 401 }
      )
    }

    const { transaction } = payload
    const transactionId = transaction.id

    // Récupérer la transaction en base
    const transactionDoc = await db
      .collection('credit_transactions')
      .doc(transactionId)
      .get()

    if (!transactionDoc.exists) {
      console.error('❌ Transaction introuvable:', transactionId)
      return NextResponse.json(
        { error: 'Transaction introuvable' },
        { status: 404 }
      )
    }

    const transactionData = transactionDoc.data()!
    const userId = transactionData.userId
    const credits = transactionData.credits

    console.log(`🔄 Traitement transaction ${transactionId} - Status: ${transaction.status}`)

    // Traitement selon le statut
    switch (transaction.status.toUpperCase()) {
      case 'SUCCESS':
        console.log(`✅ Paiement réussi - Ajout de ${credits} crédits à l'utilisateur ${userId}`)
        
        // Ajouter les crédits au solde utilisateur
        await addCreditsToUser(db, FieldValue, userId, credits, transactionId)
        
        // Mettre à jour la transaction avec les infos Airtel
        await db.collection('credit_transactions').doc(transactionId).update({
          status: 'success',
          airtelMoneyId: transaction.airtel_money_id,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        })
        
        console.log(`🎉 Crédits ajoutés avec succès !`)
        break

      case 'FAILED':
        console.log(`❌ Paiement échoué pour la transaction ${transactionId}`)
        
        await db.collection('credit_transactions').doc(transactionId).update({
          status: 'failed',
          airtelMoneyId: transaction.airtel_money_id,
          failureReason: transaction.message,
          updatedAt: FieldValue.serverTimestamp()
        })
        break

      case 'CANCELLED':
        console.log(`🚫 Paiement annulé pour la transaction ${transactionId}`)
        
        await db.collection('credit_transactions').doc(transactionId).update({
          status: 'cancelled',
          airtelMoneyId: transaction.airtel_money_id,
          failureReason: 'Paiement annulé par l\'utilisateur',
          updatedAt: FieldValue.serverTimestamp()
        })
        break

      case 'PENDING':
        console.log(`⏳ Paiement en attente pour la transaction ${transactionId}`)
        
        await db.collection('credit_transactions').doc(transactionId).update({
          airtelMoneyId: transaction.airtel_money_id,
          updatedAt: FieldValue.serverTimestamp()
        })
        break

      default:
        console.log(`❓ Statut inconnu: ${transaction.status}`)
        break
    }

    // Réponse à Airtel Money (important !)
    return NextResponse.json({ 
      status: 'success',
      message: 'Webhook traité avec succès' 
    })

  } catch (error: any) {
    console.error('💥 Erreur webhook Airtel Money:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Méthode GET pour test
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Webhook Airtel Money opérationnel',
    timestamp: new Date().toISOString()
  })
} 
