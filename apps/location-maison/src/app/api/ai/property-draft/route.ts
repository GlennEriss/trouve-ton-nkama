import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { createLogger } from '@/lib/logger';
import { AppError } from '@/lib/errors/app-error';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import AIPromptsService from '@/services/ai-prompts.service';
import AIFormService, { ProcessedFormData } from '@/services/ai-form.service';
import { auth } from '@/next-auth/auth';
import { resolveGeminiModel } from '@/lib/ai/gemini-model';
import type { TypeProperty } from '@/models/annonce';

// Même raison que api/ai/assistant/chat/route.ts : l'appel Gemini pour un
// prompt volumineux peut dépasser les 10s par défaut des fonctions Vercel.
export const maxDuration = 60;

const logger = createLogger('api.ai.property-draft');
const DRAFT_CREDIT_COST = 1;
const GEMINI_API_KEY_ENV_CANDIDATES = [
  'GEMINI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'FIREBASE_AI_API_KEY',
] as const;

// Les 12 types acceptés par DirectorFactory.createDirectorProperty
// (apps/location-maison/src/directors/factory.director.ts) — seule autre
// source de vérité pour un typeProperty de création.
const CREATABLE_TYPES: TypeProperty[] = [
  'Apartment', 'Building', 'Desk', 'Home', 'Studio', 'Room',
  'Shop', 'Kiosk', 'Villa', 'Land', 'Duplex', 'Warehouse',
];

const bodySchema = z.object({
  description: z.string().trim().min(10, 'Décris ton bien en au moins quelques mots.').max(2500),
});

export type PropertyDraftResponse = ProcessedFormData & {
  typeProperty: TypeProperty;
  whatsappContact?: string;
  callContact?: string;
  additionalContacts?: string[];
};

function resolveGeminiApiKey(): { value: string | null } {
  for (const envName of GEMINI_API_KEY_ENV_CANDIDATES) {
    const raw = process.env[envName];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return { value: raw.trim() };
    }
  }
  return { value: null };
}

async function generateWithGemini(prompt: string): Promise<string> {
  const { value: apiKey } = resolveGeminiApiKey();
  if (!apiKey) {
    throw new AppError('Configuration IA manquante sur le serveur.', {
      code: 'AI_CONFIGURATION_ERROR',
      status: 500,
      details: { expectedEnv: GEMINI_API_KEY_ENV_CANDIDATES.join(', ') },
    });
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  let text = '';

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: resolveGeminiModel(process.env.GEMINI_MODEL) });
    const result = await model.generateContent(prompt);
    text = result.response.text().trim();
  } catch (error) {
    throw new AppError('Erreur du fournisseur IA pendant la génération.', {
      code: 'AI_PROVIDER_ERROR',
      status: 502,
      details: { reason: error instanceof Error ? error.message : 'Unknown AI provider error' },
    });
  }

  if (!text) {
    throw new AppError("L'assistant IA n'a pas renvoyé de contenu.", { code: 'AI_EMPTY_RESPONSE', status: 502 });
  }

  return text.slice(0, 8000);
}

const MAX_ADDITIONAL_CONTACTS = 4;

type RawGeminiFields = {
  typeProperty: TypeProperty | null;
  whatsappContact: string;
  callContact: string;
  additionalContacts: string[];
};

/** Même nettoyage que AIFormService.extractJsonPayload (privée) — dupliqué
 * ici pour lire des champs que le pipeline AIFormService existant ignore
 * ("typeProperty", "whatsappContact", "callContact", "additionalContacts" —
 * pas dans AIFormData). */
function extractRawGeminiFields(response: string): RawGeminiFields {
  const empty: RawGeminiFields = { typeProperty: null, whatsappContact: '', callContact: '', additionalContacts: [] };
  const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  try {
    const parsed = JSON.parse(jsonSlice) as {
      typeProperty?: unknown;
      whatsappContact?: unknown;
      callContact?: unknown;
      additionalContacts?: unknown;
    };
    const typeCandidate = typeof parsed.typeProperty === 'string' ? parsed.typeProperty.trim() : '';
    const additionalContacts = Array.isArray(parsed.additionalContacts)
      ? parsed.additionalContacts
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .map((value) => value.trim())
          .slice(0, MAX_ADDITIONAL_CONTACTS)
      : [];
    return {
      typeProperty: (CREATABLE_TYPES as string[]).includes(typeCandidate) ? (typeCandidate as TypeProperty) : null,
      whatsappContact: typeof parsed.whatsappContact === 'string' ? parsed.whatsappContact.trim() : '',
      callContact: typeof parsed.callContact === 'string' ? parsed.callContact.trim() : '',
      additionalContacts,
    };
  } catch {
    return empty;
  }
}

async function findUserDocumentByUID(db: any, uid: string) {
  const usersSnapshot = await db.collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1).get();
  if (usersSnapshot.empty) return null;
  return usersSnapshot.docs[0];
}

export async function POST(request: NextRequest) {
  try {
    const bodyValidation = bodySchema.safeParse(await request.json());
    if (!bodyValidation.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Décris ton bien avant de générer.', {
        issues: bodyValidation.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }
    const { description } = bodyValidation.data;

    const [{ adminApp }, { getFirestore, FieldValue }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ]);

    const db = getFirestore(adminApp as any);
    const session = await auth().catch(() => null);
    if (!session?.user?.uid) {
      return jsonApiError(401, 'UNAUTHORIZED', "Session d'authentification requise.");
    }

    const userDoc = await findUserDocumentByUID(db, session.user.uid);
    if (!userDoc) {
      return jsonApiError(404, 'USER_NOT_FOUND', 'Profil utilisateur introuvable.');
    }

    const userUid = userDoc.data()?.uid ?? session.user.uid;
    const currentCredits = Number(userDoc.data()?.credits ?? 0);
    if (currentCredits < DRAFT_CREDIT_COST) {
      return jsonApiError(402, 'INSUFFICIENT_CREDITS', 'Crédits insuffisants pour générer une annonce avec l’IA.');
    }

    const prompt = AIPromptsService.getAutoFillPromptWithTypeDetection(description);
    const responseText = await generateWithGemini(prompt);

    const rawFields = extractRawGeminiFields(responseText);
    const typeProperty = rawFields.typeProperty;
    if (!typeProperty) {
      // Pas de repli heuristique pour l'instant : mieux vaut demander à
      // l'utilisateur de reformuler que de deviner un type au hasard sur une
      // annonce qui sera vraiment créée en base.
      return jsonApiError(
        422,
        'AI_TYPE_DETECTION_FAILED',
        "L'IA n'a pas pu déterminer le type de bien. Reformule ta description en précisant le type de logement (studio, maison, appartement...).",
      );
    }

    const aiFormService = new AIFormService();
    const parsed = aiFormService.parseAIResponse(responseText);
    const processedData = aiFormService.postProcessData(parsed);
    const formData = aiFormService.transformToFormData(processedData);

    // Crédit décompté seulement après une réponse Gemini exploitable — ne
    // jamais facturer un échec réseau/parsing/type indétectable.
    let creditsRemaining = currentCredits;
    await db.runTransaction(async (transaction: any) => {
      const freshUserSnap = await transaction.get(userDoc.ref);
      const freshCredits = Number(freshUserSnap.data()?.credits ?? 0);

      if (freshCredits < DRAFT_CREDIT_COST) {
        throw new AppError('Crédits insuffisants pour générer une annonce avec l’IA.', {
          code: 'INSUFFICIENT_CREDITS',
          status: 402,
        });
      }

      const nextCredits = freshCredits - DRAFT_CREDIT_COST;
      transaction.update(userDoc.ref, { credits: nextCredits, updatedAt: FieldValue.serverTimestamp() });

      const txRef = db.collection(firebaseCollectionNames.credit_transactions).doc();
      transaction.set(txRef, {
        uid: userUid,
        type: 'spend',
        credits: -DRAFT_CREDIT_COST,
        status: 'success',
        service: 'Assistant IA - Création annonce',
        description: `Génération annonce IA - ${description.slice(0, 80)}${description.length > 80 ? '...' : ''}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      creditsRemaining = nextCredits;
    });

    const payload: PropertyDraftResponse = {
      ...formData,
      typeProperty,
      whatsappContact: rawFields.whatsappContact || undefined,
      callContact: rawFields.callContact || undefined,
      additionalContacts: rawFields.additionalContacts.length > 0 ? rawFields.additionalContacts : undefined,
    };

    return NextResponse.json({ success: true, data: payload, creditsRemaining });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/ai/property-draft',
      fallbackMessage: "Erreur lors de la génération de l'annonce par l'IA",
      knownCodes: {
        'auth/id-token-expired': { status: 401, code: 'AUTH_TOKEN_EXPIRED', message: 'Session expirée. Veuillez vous reconnecter.' },
        'auth/invalid-id-token': { status: 401, code: 'AUTH_TOKEN_INVALID', message: "Token d'authentification invalide." },
        AI_PROVIDER_ERROR: { status: 502, code: 'AI_PROVIDER_ERROR', message: "Le fournisseur IA n'a pas pu générer de réponse pour le moment." },
      },
    });
  }
}
