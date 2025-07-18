/**
 * Route API pour vérifier le code de paiement et mettre à jour les crédits
 */

import { adminAuth, adminApp } from '@/firebase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface VerifyCodeRequestBody {
  code: string
  amount: number
}

interface VerifyCodeResponse {
  success: boolean
  message: string
  credits?: number
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyCodeResponse>> {
  try {
    if (!adminApp) {
      return NextResponse.json(
        { success: false, message: 'Erreur de configuration du système' },
        { status: 500 }
      )
    }

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token d\'authentification requis' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Vérifier le token Firebase
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Parser le body de la requête
    const body: VerifyCodeRequestBody = await request.json()
    const { code, amount } = body

    // Validation des paramètres
    if (!code || !amount) {
      return NextResponse.json(
        { success: false, message: 'Code et montant requis' },
        { status: 400 }
      )
    }

    // Vérifier le code dans la collection credit_payments
    const paymentQuery = await adminApp.firestore()
      .collection('credit_payments')
      .where('code', '==', code)
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (paymentQuery.empty) {
      return NextResponse.json(
        { success: false, message: 'Code invalide ou déjà utilisé' },
        { status: 400 }
      )
    }

    const paymentDoc = paymentQuery.docs[0]
    const paymentData = paymentDoc.data()
    console.log("paymentData", paymentData)

    // Vérifier si le montant correspond
    if (paymentData.amount !== amount) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Le montant ne correspond pas au code. Ce code est pour un montant de ${paymentData.amount} FCFA`,
          expectedAmount: paymentData.amount
        },
        { status: 400 }
      )
    }

    // Vérifier si le code a déjà été utilisé
    if (paymentData.usedBy) {
      return NextResponse.json(
        { success: false, message: 'Ce code a déjà été utilisé' },
        { status: 400 }
      )
    }

    // Vérifier que toutes les données nécessaires sont présentes
    if (!paymentData.name || !paymentData.credits || !paymentData.amount) {
      return NextResponse.json(
        { success: false, message: 'Données de paiement incomplètes' },
        { status: 400 }
      )
    }

    // Mettre à jour le statut du paiement
    await paymentDoc.ref.update({
      status: 'success',
      usedBy: uid,
      usedAt: new Date()
    })

    // Chercher l'utilisateur avec le uid décodé
    const userQuery = await adminApp.firestore()
      .collection('users')
      .where('uid', '==', uid)
      .limit(1)
      .get()

    if (userQuery.empty) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const userDoc = userQuery.docs[0]
    const userData = userDoc.data()
    const currentCredits = userData?.credits ?? 0
    const newCredits = currentCredits + paymentData.credits

    // Mettre à jour les crédits de l'utilisateur
    await userDoc.ref.update({
      credits: newCredits,
      updatedAt: new Date()
    })

    // Créer une transaction dans l'historique
    const transactionData = {
      uid: uid,
      type: 'purchase',
      packName: paymentData.name,
      credits: paymentData.credits,
      amount: paymentData.amount,
      status: 'success',
      provider: 'airtel_money',
      description: 'Achat de crédits via code',
      phoneNumber: paymentData.phoneNumber ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date()
    }

    await adminApp.firestore().collection('credit_transactions').add(transactionData)

    return NextResponse.json({
      success: true,
      message: 'Code validé avec succès',
      credits: newCredits
    })

  } catch (error: any) {
    console.error('Erreur API verify-code:', error)

    // Gestion des erreurs spécifiques Firebase
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { success: false, message: 'Session expirée, veuillez vous reconnecter' },
        { status: 401 }
      )
    }

    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json(
        { success: false, message: 'Token d\'authentification invalide' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
} 