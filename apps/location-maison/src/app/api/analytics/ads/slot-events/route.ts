import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonApiError } from '@/lib/api/error-response';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.analytics.ads-slot-events-forwarder');

const ADAPTER_DEFAULT_DEV_URL =
  'http://localhost:3001/api/admin/v1/analytics/adapters/ads-slot-events';
const REQUEST_TIMEOUT_MS = 7000;

const idSchema = z.string().trim().min(1).max(256);

const bodySchema = z
  .object({
    sent_at: z.string().trim().optional(),
    occurred_at: z.string().trim().optional(),
    environment: z.enum(['dev', 'preprod', 'prod']).optional(),
    source: z.enum([
      'catalog_search_page',
      'location_maison_search_bar',
      'search_with_ia_page',
    ]),
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
      .strict()
      .optional(),
    events: z
      .array(
        z
          .object({
            event_id: idSchema.optional(),
            event_name: z.enum([
              'ad_slot_rendered',
              'ad_request_sent',
              'ad_filled',
              'ad_impression',
              'ad_click',
            ]),
            occurred_at: z.string().trim().optional(),
            page_path: z.string().trim().max(512).optional(),
            page_template: z.string().trim().max(100).optional(),
            slot_id: z.string().trim().min(1).max(256),
            slot_position: z.string().trim().max(64).optional(),
            latency_ms: z.number().int().min(0).max(120000).optional(),
            country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
            device_category: z.enum(['mobile', 'desktop', 'tablet', 'unknown']).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export const runtime = 'nodejs';

function resolveAdapterUrl() {
  const explicitUrl = process.env.ANALYTICS_ADS_SLOT_EVENTS_ADAPTER_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return ADAPTER_DEFAULT_DEV_URL;
}

function buildCorrelationId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function pickHeaderValue(request: NextRequest, headerName: string, prefix: string) {
  const candidate = request.headers.get(headerName)?.trim();
  if (candidate && candidate.length > 0 && candidate.length <= 256) {
    return candidate;
  }
  return buildCorrelationId(prefix);
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
      'Configuration manquante: ANALYTICS_ADS_SLOT_EVENTS_ADAPTER_URL requis en production.',
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
    return jsonApiError(400, 'VALIDATION_ERROR', 'Payload analytics ads-slot-events invalide.', {
      issues: parsedBody.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const correlationId = pickHeaderValue(request, 'x-correlation-id', 'corr_ads_slot');
  const idempotencyKey = pickHeaderValue(request, 'x-idempotency-key', 'idem_ads_slot');

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
          message: "La passerelle ads-slot-events n'a retourne aucun body.",
        },
      },
      { status: upstreamResponse.status },
    );
    response.headers.set('x-correlation-id', correlationId);
    return response;
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    logger.warn('Ads slot analytics forwarder request failed', {
      correlationId,
      adapterUrl,
      isAbort,
      error,
    });

    return jsonApiError(
      isAbort ? 504 : 502,
      isAbort ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE',
      isAbort
        ? 'Timeout lors de l envoi ads slot analytics vers location-maison-admin.'
        : 'Echec de forwarding ads slot analytics vers location-maison-admin.',
      { correlationId },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

