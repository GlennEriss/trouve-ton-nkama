import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createLogger } from '@/lib/logger';
import { jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.analytics.search-forwarder');

const ADAPTER_DEFAULT_DEV_URL = 'http://localhost:3001/api/admin/v1/analytics/adapters/search';
const REQUEST_TIMEOUT_MS = 7000;

const primitiveValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const queryValueSchema = z.union([primitiveValueSchema, z.array(primitiveValueSchema).max(100)]);
const idSchema = z.string().trim().min(1).max(256);

const bodySchema = z
  .object({
    sent_at: z.string().trim().optional(),
    occurred_at: z.string().trim().optional(),
    environment: z.enum(['dev', 'preprod', 'prod']).optional(),
    actor: z
      .object({
        actor_type: z.enum(['user', 'admin', 'system']).optional(),
        actor_id: idSchema.optional(),
        is_authenticated: z.boolean().optional(),
      })
      .strict()
      .optional(),
    session: z
      .object({
        session_id: idSchema,
      })
      .strict(),
    search: z
      .object({
        source: z.enum([
          'catalog_search_page',
          'location_maison_search_bar',
          'search_with_ia_page',
        ]),
        search_id: idSchema.optional(),
        query_text_raw: z.string().trim().max(160).optional(),
        query_params: z.record(z.string(), queryValueSchema).optional(),
        sort: z.string().trim().max(40).optional(),
        page: z.number().int().min(1).max(200).optional(),
        page_size: z.number().int().min(1).max(100).optional(),
      })
      .strict(),
    result: z
      .object({
        results_count: z.number().int().min(0).max(10000),
        result_ids_sample: z.array(idSchema).max(20).optional(),
        execution_ms: z.number().int().min(0).max(30000).optional(),
        engine: z.string().trim().max(64).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const runtime = 'nodejs';

function resolveAdapterUrl() {
  const explicitUrl = process.env.ANALYTICS_SEARCH_ADAPTER_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return ADAPTER_DEFAULT_DEV_URL;
}

function buildCorrelationId(fallbackPrefix: string) {
  return `${fallbackPrefix}_${randomUUID()}`;
}

function pickHeaderValue(
  request: NextRequest,
  headerName: string,
  fallbackPrefix: string,
) {
  const candidate = request.headers.get(headerName)?.trim();
  if (candidate && candidate.length > 0 && candidate.length <= 256) {
    return candidate;
  }
  return buildCorrelationId(fallbackPrefix);
}

async function readJsonLike(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  if (!text) {
    return null;
  }
  return {
    success: false,
    error: {
      code: 'UPSTREAM_NON_JSON',
      message: text.slice(0, 2000),
    },
  };
}

export async function POST(request: NextRequest) {
  const adapterUrl = resolveAdapterUrl();
  const serviceToken = process.env.ANALYTICS_INGEST_TOKEN?.trim();

  if (!adapterUrl) {
    return jsonApiError(
      500,
      'CONFIGURATION_ERROR',
      'Configuration manquante: ANALYTICS_SEARCH_ADAPTER_URL requis en production.',
    );
  }

  if (!serviceToken) {
    return jsonApiError(
      500,
      'CONFIGURATION_ERROR',
      'Configuration manquante: ANALYTICS_INGEST_TOKEN requis.',
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body);

  if (!parsedBody.success) {
    return jsonApiError(400, 'VALIDATION_ERROR', 'Payload analytics search invalide.', {
      issues: parsedBody.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const correlationId = pickHeaderValue(request, 'x-correlation-id', 'corr_locmaison');
  const idempotencyKey = pickHeaderValue(request, 'x-idempotency-key', 'idem_locmaison');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(adapterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
        'X-Correlation-Id': correlationId,
        'Idempotency-Key': idempotencyKey,
        'X-Analytics-Source': 'location-maison',
      },
      body: JSON.stringify(parsedBody.data),
      signal: controller.signal,
    });

    const upstreamPayload = await readJsonLike(upstreamResponse);
    const response = NextResponse.json(
      upstreamPayload ?? {
        success: false,
        error: {
          code: 'UPSTREAM_EMPTY_RESPONSE',
          message: 'La passerelle analytics n a retourne aucun body.',
        },
      },
      { status: upstreamResponse.status },
    );
    response.headers.set('x-correlation-id', correlationId);
    return response;
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    logger.warn('Search analytics forwarder request failed', {
      correlationId,
      adapterUrl,
      isAbort,
      error,
    });

    return jsonApiError(
      isAbort ? 504 : 502,
      isAbort ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE',
      isAbort
        ? 'Timeout lors de l envoi analytics vers location-maison-admin.'
        : 'Echec de forwarding analytics vers location-maison-admin.',
      { correlationId },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
