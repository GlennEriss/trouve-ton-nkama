'use server'

import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'

const logger = createLogger('actions.send-auth-email')

export async function sendVerificationEmail(email: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/send-verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        subject: 'Vérifiez votre adresse email - Trouve Ton Nkama',
      }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      revalidatePath('/')
      return {
        success: true,
        message: 'Email de vérification envoyé avec succès',
      }
    } else {
      return {
        success: false,
        error: data.error || 'Erreur lors de l\'envoi de l\'email',
      }
    }
  } catch (error: any) {
    logger.error('Failed to send verification email action', { error, email })
    return {
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de vérification',
    }
  }
}

export async function sendPasswordResetEmail(email: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/send-password-reset-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        subject: 'Réinitialisez votre mot de passe - Trouve Ton Nkama',
      }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      revalidatePath('/')
      return {
        success: true,
        message: 'Email de réinitialisation envoyé avec succès',
      }
    } else {
      return {
        success: false,
        error: data.error || 'Erreur lors de l\'envoi de l\'email',
      }
    }
  } catch (error: any) {
    logger.error('Failed to send password reset email action', { error, email })
    return {
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de réinitialisation',
    }
  }
} 
