/**
 * Route API pour récupérer le solde de crédits
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { adminAuth } from '@/firebase/admin'

interface BalanceResponse {
  success: boolean
  credits?: number
  message: string
  error?: string
}

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

export async function GET(request: NextRequest): Promise<NextResponse<BalanceResponse>> {
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

    // Récupérer le document utilisateur par UID
    const userDoc = await findUserDocumentByUID(userId)
    
    if (!userDoc) {
      // L'utilisateur n'existe pas encore en base
      // On ne peut pas le créer automatiquement car on n'a pas toutes les infos
      return NextResponse.json({
        success: false,
        message: 'Profil utilisateur non trouvé. Veuillez compléter votre inscription.'
      }, { status: 404 })
    }

    const userData = userDoc.data()
    let credits = userData?.credits

    // Si le champ credits n'existe pas, l'initialiser avec 3 crédits de bienvenue
    if (typeof credits === 'undefined') {
      credits = 3
      await userDoc.ref.update({
        credits,
        updatedAt: FieldValue.serverTimestamp()
      })

      return NextResponse.json({
        success: true,
        credits,
        message: 'Bienvenue ! Vous avez reçu 3 crédits gratuits'
      })
    }

    return NextResponse.json({
      success: true,
      credits,
      message: `Vous avez ${credits} crédit${credits > 1 ? 's' : ''}`
    })

  } catch (error: any) {
    console.error('Erreur API balance:', error)

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
        message: 'Erreur lors de la récupération du solde',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
} 