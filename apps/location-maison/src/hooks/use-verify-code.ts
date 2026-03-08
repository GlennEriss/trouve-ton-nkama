/**
 * Hook pour vérifier le code de paiement
 */

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/firebase/auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('hooks.use-verify-code')

interface VerifyCodeRequest {
  code: string
  amount: number
}

interface VerifyCodeResponse {
  success: boolean
  message: string
  credits?: number
  error?: string
}

function extractErrorMessage(payload: any, fallback: string): string {
  return payload?.message ?? payload?.error?.message ?? fallback
}

export async function verifyCodeAPI(data: VerifyCodeRequest): Promise<VerifyCodeResponse> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Utilisateur non authentifié')
  }

  const token = await user.getIdToken()

  const response = await fetch('/api/credits/verify-code', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  const responseData = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(extractErrorMessage(responseData, 'Erreur lors de la vérification du code'))
  }

  return responseData as VerifyCodeResponse
}

export function useVerifyCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyCodeAPI,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['credits-balance'] })
      await queryClient.invalidateQueries({ queryKey: ['credits-history'] })
      await queryClient.refetchQueries({ queryKey: ['credits-balance'] })

      logger.info('Payment code verified', {
        credits: data.credits,
      })
    },
    onError: (error: Error) => {
      logger.error('Payment code verification failed', { error })
    }
  })
}
