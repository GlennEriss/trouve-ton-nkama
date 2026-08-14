import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { createLogger } from '@/lib/logger';
import { AppError } from '@/lib/errors/app-error';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { auth } from '@/next-auth/auth';
import { resolveGeminiModel } from '@/lib/ai/gemini-model';
import {
  buildCategoryListingDraftPrompt,
  CategoryListingDraftError,
  parseCategoryListingDraftResponse,
} from '@/services/ai-category-listing.service';
import type { PublishableAttributeField, PublishableCategoryLeaf } from '@/app/api/categories/publishable-leaves/route';

// Même raison que api/ai/property-draft/route.ts : l'appel Gemini peut dépasser les 10s
// par défaut des fonctions Vercel.
export const maxDuration = 60;

const logger = createLogger('api.ai.category-listing-draft');
const DRAFT_CREDIT_COST = 1;
const GEMINI_API_KEY_ENV_CANDIDATES = [
  'GEMINI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'FIREBASE_AI_API_KEY',
] as const;

const bodySchema = z.object({
  description: z.string().trim().min(10, 'Décris ton article en au moins quelques mots.').max(2500),
});

function toAttributeType(value: unknown): 'text' | 'number' | 'enum' | 'boolean' {
  if (value === 'number' || value === 'enum' || value === 'boolean') {
    return value;
  }
  return 'text';
}

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

async function findUserDocumentByUID(db: any, uid: string) {
  const usersSnapshot = await db.collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1).get();
  if (usersSnapshot.empty) return null;
  return usersSnapshot.docs[0];
}

/** Même requête que GET /api/categories/publishable-leaves — dupliquée volontairement
 * (fichier de route séparé, pas de module partagé entre deux endpoints Next.js pour un
 * si petit bout de logique) plutôt qu'un appel HTTP interne. */
async function loadPublishableLeaves(db: any): Promise<PublishableCategoryLeaf[]> {
  const activeSnapshot = await db.collection('listing_categories').where('isActive', '==', true).get();

  const rootNameById = new Map<string, string>();
  for (const doc of activeSnapshot.docs) {
    const data = doc.data();
    if (data.parentId !== null || doc.id === 'immobilier') continue;
    rootNameById.set(doc.id, typeof data.name === 'string' ? data.name : doc.id);
  }

  return activeSnapshot.docs
    .map((doc: any) => {
      const data = doc.data();
      const parentId = typeof data.parentId === 'string' ? data.parentId : null;
      return { doc, data, parentId };
    })
    .filter(({ parentId }: any) => parentId !== null && rootNameById.has(parentId))
    .map(
      ({ doc, data, parentId }: any): PublishableCategoryLeaf => ({
        id: doc.id,
        slug: typeof data.slug === 'string' ? data.slug : doc.id,
        name: typeof data.name === 'string' ? data.name : doc.id,
        rootId: parentId as string,
        rootName: rootNameById.get(parentId as string) as string,
        locationPrecision:
          data.locationPrecision === 'exact' || data.locationPrecision === 'none' ? data.locationPrecision : 'city',
        attributeSchema: (Array.isArray(data.attributeSchema) ? data.attributeSchema : [])
          .filter((field: unknown): field is Record<string, unknown> => Boolean(field) && typeof field === 'object')
          .map(
            (field: Record<string, unknown>): PublishableAttributeField => ({
              key: String(field.key ?? ''),
              label: String(field.label ?? field.key ?? ''),
              type: toAttributeType(field.type),
              options: Array.isArray(field.options)
                ? field.options.filter((o): o is string => typeof o === 'string')
                : undefined,
              required: field.required === true,
            }),
          )
          .filter((field: PublishableAttributeField) => field.key.length > 0),
      }),
    );
}

export async function POST(request: NextRequest) {
  try {
    const bodyValidation = bodySchema.safeParse(await request.json());
    if (!bodyValidation.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Décris ton article avant de générer.', {
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

    const categories = await loadPublishableLeaves(db);
    if (categories.length === 0) {
      return jsonApiError(400, 'NO_CATEGORY_AVAILABLE', "Aucune catégorie n'accepte de nouvelles annonces pour le moment.");
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

    const prompt = buildCategoryListingDraftPrompt(description, categories);
    const responseText = await generateWithGemini(prompt);

    let draft;
    try {
      draft = parseCategoryListingDraftResponse(responseText, categories);
    } catch (parseError) {
      if (parseError instanceof CategoryListingDraftError) {
        return jsonApiError(
          422,
          'AI_CATEGORY_DETECTION_FAILED',
          "L'IA n'a pas pu déterminer la catégorie de ton article. Reformule ta description en précisant ce que tu vends (vêtement, chaussure, parfum, accessoire...).",
        );
      }
      return jsonApiError(
        422,
        'AI_PARSE_FAILED',
        "L'IA n'a pas pu générer une annonce exploitable. Reformule ta description.",
      );
    }
    if (!draft.title || !draft.description) {
      return jsonApiError(
        422,
        'AI_PARSE_FAILED',
        "L'IA n'a pas pu générer une annonce exploitable. Reformule ta description.",
      );
    }

    // Crédit décompté seulement après une réponse Gemini exploitable — jamais facturé un
    // échec réseau/parsing (même convention que api/ai/property-draft/route.ts).
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
        service: 'Assistant IA - Création annonce catégorie',
        description: `Génération annonce IA (${draft.categoryId}) - ${description.slice(0, 80)}${description.length > 80 ? '...' : ''}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      creditsRemaining = nextCredits;
    });

    return NextResponse.json({ success: true, data: draft, creditsRemaining });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/ai/category-listing-draft',
      fallbackMessage: "Erreur lors de la génération de l'annonce par l'IA",
      knownCodes: {
        'auth/id-token-expired': { status: 401, code: 'AUTH_TOKEN_EXPIRED', message: 'Session expirée. Veuillez vous reconnecter.' },
        'auth/invalid-id-token': { status: 401, code: 'AUTH_TOKEN_INVALID', message: "Token d'authentification invalide." },
        AI_PROVIDER_ERROR: { status: 502, code: 'AI_PROVIDER_ERROR', message: "Le fournisseur IA n'a pas pu générer de réponse pour le moment." },
      },
    });
  }
}
