import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonApiError } from '@/lib/api/error-response';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.analytics.adsense-report-forwarder');

const ADAPTER_DEFAULT_DEV_URL =
  'http://localhost:3001/api/admin/v1/analytics/adapters/adsense';
const REQUEST_TIMEOUT_MS = 7000;

const idSchema = z.string().trim().min(1).max(256);
const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);

const bodySchema = z
  .object({
    sent_at: z.string().trim().optional(),
    environment: z.enum(['dev', 'preprod', 'prod']).optional(),
    account_id: z.string().trim().max(256).optional(),
    report_rows: z
      .array(
        z
          .object({
            report_date: isoDateSchema,
            dimension_page_url: z.string().trim().max(2048).optional(),
            dimension_ad_unit: z.string().trim().max(256).optional(),
            dimension_country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
            dimension_device: z.string().trim().max(64).optional(),
            estimated_earnings: z.number().min(0),
            page_views: z.number().int().min(0).default(0),
            ad_requests: z.number().int().min(0).default(0),
            matched_ad_requests: z.number().int().min(0).default(0),
            total_impressions: z.number().int().min(0).default(0),
            clicks: z.number().int().min(0).default(0),
            page_views_rpm: z.number().min(0).optional(),
            impressions_rpm: z.number().min(0).optional(),
            active_view_viewability: z.number().min(0).max(1000).optional(),
            active_view_measurability: z.number().min(0).max(1000).optional(),
            loaded_at: z.string().trim().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(5000),
    batch_id: idSchema.optional(),
    correlation_id: idSchema.optional(),
  })
  .strict();

export const runtime = 'nodejs';

function resolveAdapterUrl() {
  const explicitUrl = process.env.ANALYTICS_ADSENSE_ADAPTER_URL?.trim();
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
      'Configuration manquante: ANALYTICS_ADSENSE_ADAPTER_URL requis en production.',
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
    return jsonApiError(400, 'VALIDATION_ERROR', 'Payload analytics adsense invalide.', {
      issues: parsedBody.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const correlationId = pickHeaderValue(request, 'x-correlation-id', 'corr_adsense');
  const idempotencyKey = pickHeaderValue(request, 'x-idempotency-key', 'idem_adsense');

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
          message: "La passerelle adsense n'a retourne aucun body.",
        },
      },
      { status: upstreamResponse.status },
    );
    response.headers.set('x-correlation-id', correlationId);
    return response;
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    logger.warn('AdSense report forwarder request failed', {
      correlationId,
      adapterUrl,
      isAbort,
      error,
    });

    return jsonApiError(
      isAbort ? 504 : 502,
      isAbort ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE',
      isAbort
        ? 'Timeout lors de l envoi adsense report vers location-maison-admin.'
        : 'Echec de forwarding adsense report vers location-maison-admin.',
      { correlationId },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

