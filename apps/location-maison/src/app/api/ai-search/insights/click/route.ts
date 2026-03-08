import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { AppError } from '@/lib/errors/app-error';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.ai-search.insights-click');
const DEFAULT_ALGOLIA_INDEX = 'location-maison_property-index';

const bodySchema = z.object({
  objectId: z.string().trim().min(1).max(160),
  queryId: z.string().trim().min(1).max(240),
  indexName: z.string().trim().min(1).max(160).optional(),
  position: z.number().int().min(1).max(1000),
  entrypointSource: z.enum(['search_cta', 'direct', 'other']).optional(),
});

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
    const [{ adminAuth }, appConfig] = await Promise.all([
      import('@/firebase/admin'),
      Promise.resolve({
        appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
        apiKey: process.env.ALGOLIA_INSIGHTS_API_KEY ?? process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
        defaultIndexName: process.env.ALGOLIA_INDEX_NAME ?? DEFAULT_ALGOLIA_INDEX,
      }),
    ]);

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    if (!appConfig.appId || !appConfig.apiKey) {
      throw new AppError('Configuration Algolia Insights incomplète.', {
        code: 'ALGOLIA_CONFIGURATION_ERROR',
        status: 500,
      });
    }

    const response = await fetch('https://insights.algolia.io/1/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': appConfig.appId,
        'X-Algolia-API-Key': appConfig.apiKey,
      },
      body: JSON.stringify({
        events: [
          {
            eventType: 'click',
            eventName: 'AI Search Result Clicked',
            index: body.indexName ?? appConfig.defaultIndexName,
            userToken: uid,
            queryID: body.queryId,
            objectIDs: [body.objectId],
            positions: [body.position],
            timestamp: Date.now(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      logger.warn('Algolia insights event push failed', {
        status: response.status,
        payload,
      });
      throw new AppError("Impossible d'enregistrer l'événement de clic Algolia.", {
        code: 'ALGOLIA_INSIGHTS_PUSH_FAILED',
        status: 502,
      });
    }

    return NextResponse.json({
      success: true,
      tracked: true,
      source: body.entrypointSource ?? 'other',
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/ai-search/insights/click',
      fallbackMessage: "Erreur lors de l'envoi de l'événement de clic Algolia",
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
      },
    });
  }
}
