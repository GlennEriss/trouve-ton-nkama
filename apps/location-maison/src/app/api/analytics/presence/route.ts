import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonApiError } from '@/lib/api/error-response';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.analytics.presence-forwarder');

const INGEST_DEFAULT_DEV_URL = 'http://localhost:3001/api/admin/v1/analytics/events/ingest';
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
      .strict(),
    session: z
      .object({
        session_id: idSchema,
      })
      .strict(),
    presence: z
      .object({
        status: z.enum(['online', 'offline']).default('online'),
        device_type: z.enum(['mobile', 'desktop', 'tablet', 'unknown']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const runtime = 'nodejs';

function resolveIngestUrl() {
  const explicitUrl = process.env.ANALYTICS_INGEST_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return INGEST_DEFAULT_DEV_URL;
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

function resolveEnvironment(input?: string): 'dev' | 'preprod' | 'prod' {
  if (input === 'dev' || input === 'preprod' || input === 'prod') {
    return input;
  }

  const raw = (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase();

  if (raw === 'prod' || raw === 'production') {
    return 'prod';
  }
  if (raw === 'preprod' || raw === 'staging') {
    return 'preprod';
  }
  return 'dev';
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
  const ingestUrl = resolveIngestUrl();
  const serviceToken = process.env.ANALYTICS_INGEST_TOKEN?.trim();

  if (!ingestUrl) {
    return jsonApiError(
      500,
      'CONFIGURATION_ERROR',
      'Configuration manquante: ANALYTICS_INGEST_URL requis en production.',
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
    return jsonApiError(400, 'VALIDATION_ERROR', 'Payload analytics presence invalide.', {
      issues: parsedBody.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const correlationId = pickHeaderValue(request, 'x-correlation-id', 'corr_presence');
  const idempotencyKey = pickHeaderValue(request, 'x-idempotency-key', 'idem_presence');
  const nowIso = new Date().toISOString();
  const occurredAt = parsedBody.data.occurred_at?.trim() || nowIso;
  const sessionId = parsedBody.data.session.session_id;
  const actorId = parsedBody.data.actor.actor_id?.trim() || undefined;
  const subjectId = actorId ? actorId : `anon:${sessionId}`;

  const canonicalBatch = {
    batch_id: `batch_presence_${randomUUID()}`,
    sent_at: parsedBody.data.sent_at?.trim() || nowIso,
    events: [
      {
        event_id: `evt_presence_${randomUUID()}`,
        event_name: 'user_presence_heartbeat',
        schema_version: '1.0.0',
        occurred_at: occurredAt,
        source: parsedBody.data.source,
        environment: resolveEnvironment(parsedBody.data.environment),
        correlation_id: correlationId,
        actor: {
          actor_type: parsedBody.data.actor.actor_type ?? 'user',
          actor_id: actorId,
          is_authenticated: parsedBody.data.actor.is_authenticated ?? false,
        },
        session: {
          session_id: sessionId,
        },
        payload: {
          presence_subject: 'user',
          subject_id: subjectId,
          session_id: sessionId,
          status: parsedBody.data.presence?.status ?? 'online',
          last_seen_at: occurredAt,
          device_type: parsedBody.data.presence?.device_type ?? 'unknown',
          app_surface: 'web',
        },
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
        'X-Correlation-Id': correlationId,
        'Idempotency-Key': idempotencyKey,
        'X-Analytics-Source': 'location-maison',
      },
      body: JSON.stringify(canonicalBatch),
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
    logger.warn('Presence analytics forwarder request failed', {
      correlationId,
      ingestUrl,
      isAbort,
      error,
    });

    return jsonApiError(
      isAbort ? 504 : 502,
      isAbort ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE',
      isAbort
        ? 'Timeout lors de l envoi presence analytics vers location-maison-admin.'
        : 'Echec de forwarding presence analytics vers location-maison-admin.',
      { correlationId },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
