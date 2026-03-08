'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { auth } from '@/firebase/auth';
import { FormContext } from '@/services/ai-prompts.service';

interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  creditsRemaining?: number;
  transactionId?: string;
}

interface AIAssistantHook {
  sendMessage: (message: string, context?: FormContext) => Promise<AIResponse>;
  creditsAvailable: number;
  isLoading: boolean;
}

export const useAIAssistant = (): AIAssistantHook => {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, context?: FormContext): Promise<AIResponse> => {
    if (!session?.user) {
      return {
        success: false,
        error: "Vous devez être connecté pour utiliser l'assistant IA",
      };
    }

    if (!session.user.credits || session.user.credits <= 0) {
      return {
        success: false,
        error: "Crédits insuffisants pour utiliser l'assistant IA. Veuillez recharger votre compte.",
      };
    }

    if (!auth.currentUser) {
      return {
        success: false,
        error: 'Connexion Firebase en cours. Réessayez dans quelques secondes.',
      };
    }

    setIsLoading(true);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/ai/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message,
          context,
        }),
      });

      const payload = (await response.json()) as
        | {
            success: true;
            response: string;
            creditsRemaining: number;
            transactionId: string | null;
          }
        | { success?: false; error?: { message?: string } };

      if (!response.ok || !('success' in payload) || !payload.success) {
        return {
          success: false,
          error: (payload as any)?.error?.message ?? "Erreur lors de l'appel à l'assistant IA",
        };
      }

      const successPayload = payload as {
        success: true;
        response: string;
        creditsRemaining: number;
        transactionId: string | null;
      };

      if (typeof successPayload.creditsRemaining === 'number') {
        await update({
          user: {
            ...(session.user as any),
            credits: successPayload.creditsRemaining,
          },
        });
      }

      return {
        success: true,
        response: successPayload.response,
        creditsRemaining: successPayload.creditsRemaining,
        transactionId: successPayload.transactionId ?? undefined,
      };
    } catch {
      return {
        success: false,
        error: "Erreur inattendue lors de la communication avec l'assistant",
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    creditsAvailable: session?.user?.credits ?? 0,
    isLoading,
  };
};

export default useAIAssistant;
