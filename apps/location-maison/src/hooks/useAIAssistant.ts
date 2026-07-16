'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { auth } from '@/firebase/auth';
import type { FormContext } from '@/services/ai-prompts.service';
import { createLogger } from '@/lib/logger';

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

const logger = createLogger('hooks.use-ai-assistant');
const MAX_MESSAGE_LENGTH = 40000;
const ENABLE_FIREBASE_AI_FALLBACK = process.env.NEXT_PUBLIC_ENABLE_FIREBASE_AI_FALLBACK === 'true';

async function sendToFirebaseAI(message: string, context?: FormContext): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const [{ model }, { default: AIPromptsService }] = await Promise.all([
      import('@/firebase/ai'),
      import('@/services/ai-prompts.service'),
    ]);
    const prompt = context
      ? AIPromptsService.buildContextualPrompt(message, context)
      : `${AIPromptsService.getSystemPrompt()}\n\nQUESTION: ${message}\n\nRéponds en français de manière utile:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text?.trim()) {
      return {
        success: false,
        error: "L'assistant IA n'a pas renvoyé de contenu.",
      };
    }

    return {
      success: true,
      text,
    };
  } catch (error) {
    logger.error('Fallback Firebase AI generation failed', { error });
    return {
      success: false,
      error: "Erreur lors de la communication avec l'assistant IA",
    };
  }
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

    const normalizedMessage = typeof message === 'string' ? message.trim() : '';
    if (normalizedMessage.length < 2) {
      return {
        success: false,
        error: 'Message trop court. Décris un peu plus le bien pour lancer la génération.',
      };
    }

    const requestMessage =
      normalizedMessage.length > MAX_MESSAGE_LENGTH
        ? normalizedMessage.slice(0, MAX_MESSAGE_LENGTH)
        : normalizedMessage;

    if (requestMessage.length !== normalizedMessage.length) {
      logger.warn('AI message truncated before API request', {
        originalLength: normalizedMessage.length,
        truncatedLength: requestMessage.length,
      });
    }

    setIsLoading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/ai/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          message: requestMessage,
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
        | { success?: false; error?: { code?: string; message?: string; details?: { issues?: Array<{ path?: string; message?: string }> } } };

      if (!response.ok || !('success' in payload) || !payload.success) {
        const errorPayload = payload as any;
        const issueMessage = Array.isArray(errorPayload?.error?.details?.issues)
          ? errorPayload.error.details.issues
              .map((issue: { path?: string; message?: string }) =>
                [issue?.path, issue?.message].filter(Boolean).join(': ')
              )
              .filter(Boolean)
              .join(' | ')
          : null;
        const baseMessage = errorPayload?.error?.message ?? "Erreur lors de l'appel à l'assistant IA";
        const errorCode = errorPayload?.error?.code as string | undefined;
        const shouldTryFirebaseFallback =
          response.status >= 500 ||
          errorCode === 'AI_CONFIGURATION_ERROR' ||
          errorCode === 'AI_PROVIDER_ERROR' ||
          errorCode === 'INTERNAL_SERVER_ERROR';

        if (ENABLE_FIREBASE_AI_FALLBACK && shouldTryFirebaseFallback && session?.user?.uid) {
          logger.warn('Server AI route failed, trying Firebase AI fallback', {
            status: response.status,
            errorCode,
          });

          const fallbackResult = await sendToFirebaseAI(requestMessage, context);
          if (fallbackResult.success && fallbackResult.text) {
            const { deductCreditsWithTransaction } = await import('@/db/credit-transaction.db');
            const description = `Assistant IA - Question: "${requestMessage.substring(0, 50)}${requestMessage.length > 50 ? '...' : ''}"`;
            const transactionResult = await deductCreditsWithTransaction(
              session.user.uid,
              1,
              'Assistant IA',
              undefined,
              description
            );

            if (!transactionResult.success) {
              return {
                success: false,
                error: 'Réponse IA générée mais la transaction de crédits a échoué.',
              };
            }

            const newCredits = Math.max(0, (session.user.credits ?? 0) - 1);
            await update({
              user: {
                ...(session.user as any),
                credits: newCredits,
              },
            });

            return {
              success: true,
              response: fallbackResult.text,
              creditsRemaining: newCredits,
              transactionId: transactionResult.transactionId,
            };
          }
        }

        return {
          success: false,
          error: issueMessage ? `${baseMessage} (${issueMessage})` : baseMessage,
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
