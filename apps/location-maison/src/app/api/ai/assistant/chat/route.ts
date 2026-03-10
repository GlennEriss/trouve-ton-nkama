import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { createLogger } from '@/lib/logger';
import { AppError } from '@/lib/errors/app-error';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import AIPromptsService, { FormContext } from '@/services/ai-prompts.service';

const logger = createLogger('api.ai.assistant.chat');
const ASSISTANT_CREDIT_COST = 1;
const GEMINI_API_KEY_ENV_CANDIDATES = [
  'GEMINI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'FIREBASE_AI_API_KEY',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
] as const;

const bodySchema = z.object({
  message: z.string().trim().min(2).max(40000),
  context: z.any().optional(),
});

function resolveGeminiApiKey(): { value: string | null; source: string | null } {
  for (const envName of GEMINI_API_KEY_ENV_CANDIDATES) {
    const raw = process.env[envName];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return { value: raw.trim(), source: envName };
    }
  }
  return { value: null, source: null };
}

async function generateWithGemini(prompt: string): Promise<string> {
  const { value: apiKey, source } = resolveGeminiApiKey();
  if (!apiKey) {
    throw new AppError('Configuration IA manquante sur le serveur.', {
      code: 'AI_CONFIGURATION_ERROR',
      status: 500,
      details: {
        expectedEnv: GEMINI_API_KEY_ENV_CANDIDATES.join(', '),
      },
    });
  }

  if (source === 'NEXT_PUBLIC_FIREBASE_API_KEY') {
    logger.warn('Using NEXT_PUBLIC_FIREBASE_API_KEY for Gemini server generation', {
      source,
    });
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  let text = '';

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    text = result.response.text().trim();
  } catch (error) {
    throw new AppError("Erreur du fournisseur IA pendant la génération.", {
      code: 'AI_PROVIDER_ERROR',
      status: 502,
      details: {
        reason: error instanceof Error ? error.message : 'Unknown AI provider error',
      },
    });
  }

  if (!text) {
    throw new AppError("L'assistant IA n'a pas renvoyé de contenu.", {
      code: 'AI_EMPTY_RESPONSE',
      status: 502,
    });
  }

  return text.slice(0, 8000);
}

async function findUserDocumentByUID(db: any, uid: string) {
  const usersSnapshot = await db.collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1).get();
  if (usersSnapshot.empty) return null;
  return usersSnapshot.docs[0];
}

function buildAssistantPrompt(message: string, context?: FormContext): string {
  if (context) {
    return AIPromptsService.buildContextualPrompt(message, context);
  }

  return `${AIPromptsService.getSystemPrompt()}\n\nQUESTION: ${message}\n\nRéponds en français de manière utile:`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonApiError(401, 'UNAUTHORIZED', "Token d'authentification requis.");
    }

    const token = authHeader.split('Bearer ')[1];
    const bodyValidation = bodySchema.safeParse(await request.json());
    if (!bodyValidation.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Données de requête invalides.', {
        issues: bodyValidation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const body = bodyValidation.data;

    const [{ adminAuth, adminApp }, { getFirestore, FieldValue }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ]);

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const db = getFirestore(adminApp as any);

    const userDoc = await findUserDocumentByUID(db, uid);
    if (!userDoc) {
      return jsonApiError(404, 'USER_NOT_FOUND', 'Profil utilisateur introuvable.');
    }

    const currentCredits = Number(userDoc.data()?.credits ?? 0);
    if (currentCredits < ASSISTANT_CREDIT_COST) {
      return jsonApiError(402, 'INSUFFICIENT_CREDITS', 'Crédits insuffisants pour utiliser l’assistant IA.');
    }

    const prompt = buildAssistantPrompt(body.message, body.context as FormContext | undefined);
    const responseText = await generateWithGemini(prompt);

    let creditsRemaining = currentCredits;
    let transactionId: string | null = null;

    await db.runTransaction(async (transaction: any) => {
      const freshUserSnap = await transaction.get(userDoc.ref);
      const freshCredits = Number(freshUserSnap.data()?.credits ?? 0);

      if (freshCredits < ASSISTANT_CREDIT_COST) {
        throw new AppError('Crédits insuffisants pour utiliser l’assistant IA.', {
          code: 'INSUFFICIENT_CREDITS',
          status: 402,
        });
      }

      const nextCredits = freshCredits - ASSISTANT_CREDIT_COST;
      transaction.update(userDoc.ref, {
        credits: nextCredits,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const txRef = db.collection(firebaseCollectionNames.credit_transactions).doc();
      transactionId = txRef.id;
      transaction.set(txRef, {
        uid,
        type: 'spend',
        credits: -ASSISTANT_CREDIT_COST,
        status: 'success',
        service: 'Assistant IA',
        description: `Assistant IA - ${body.message.slice(0, 80)}${body.message.length > 80 ? '...' : ''}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      creditsRemaining = nextCredits;
    });

    return NextResponse.json({
      success: true,
      response: responseText,
      creditsRemaining,
      transactionId,
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/ai/assistant/chat',
      fallbackMessage: "Erreur lors de la génération de la réponse de l'assistant IA",
      knownCodes: {
        'auth/id-token-expired': {
          status: 401,
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Session expirée. Veuillez vous reconnecter.',
        },
        'auth/invalid-id-token': {
          status: 401,
          code: 'AUTH_TOKEN_INVALID',
          message: "Token d'authentification invalide.",
        },
        AI_PROVIDER_ERROR: {
          status: 502,
          code: 'AI_PROVIDER_ERROR',
          message: "Le fournisseur IA n'a pas pu générer de réponse pour le moment.",
        },
      },
    });
  }
}
