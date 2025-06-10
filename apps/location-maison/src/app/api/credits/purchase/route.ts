/**
 * Route API pour initier l'achat de crédits
 */

import { adminAuth } from '@/firebase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface PurchaseRequestBody {
  packId: string
  code: string
}

interface PurchaseResponse {
  success: boolean
  transactionId?: string
  checkoutUrl?: string
  message: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<PurchaseResponse>> {
  try {
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
    const userId = decodedToken.uid

    // Parser le body de la requête
    const body: PurchaseRequestBody = await request.json()
    const { packId, code } = body

    // Validation des paramètres
    if (!packId || !code) {
      return NextResponse.json(
        { success: false, message: 'Pack ID et code requis' },
        { status: 400 }
      )
    }

    // Appel à la Cloud Function - utilise l'émulateur local sauf si déployé sur une plateforme cloud
    const isLocalEnvironment = !process.env.VERCEL && !process.env.NETLIFY && !process.env.CF_PAGES
    const cloudFunctionUrl = isLocalEnvironment
      ? `http://127.0.0.1:5001/${process.env.FIREBASE_PROJECT_ID}/us-central1/initiatePurchase`
      : `https://us-central1-${process.env.FIREBASE_PROJECT_ID}.cloudfunctions.net/initiatePurchase`

    console.log('🚀 Appel Cloud Function:', cloudFunctionUrl)

    // Pour les fonctions onCall, nous devons envoyer les données dans le format attendu
    const cloudFunctionResponse = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        data: {
          packId,
          code
        }
      })
    })

    if (!cloudFunctionResponse.ok) {
      const errorData = await cloudFunctionResponse.json().catch(() => ({}))
      console.error('❌ Erreur Cloud Function:', cloudFunctionResponse.status, errorData)
      
      return NextResponse.json({
        success: false,
        message: errorData.error || 'Erreur lors de l\'initiation du paiement',
        error: process.env.NODE_ENV === 'development' ? `Cloud Function error: ${cloudFunctionResponse.status}` : undefined
      }, { status: 500 })
    }

    const result = await cloudFunctionResponse.json()
    console.log('✅ Réponse Cloud Function:', result)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Erreur API purchase:', error)

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