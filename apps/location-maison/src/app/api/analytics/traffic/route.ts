import { createHash, randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonApiError } from '@/lib/api/error-response';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.analytics.traffic-forwarder');

const INGEST_DEFAULT_DEV_URL = 'http://localhost:3001/api/admin/v1/analytics/events/ingest';
const REQUEST_TIMEOUT_MS = 7000;

const idSchema = z.string().trim().min(1).max(256);

const bodySchema = z
  .object({
    sent_at: z.string().trim().optional(),
    occurred_at: z.string().trim().optional(),
    environment: z.enum(['dev', 'preprod', 'prod']).optional(),
    provider: z.enum(['vercel', 'firebase']).default('vercel'),
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
    visits: z
      .array(
        z
          .object({
            provider_event_id: idSchema.optional(),
            metric_name: z.enum(['visit', 'unique_visitor', 'page_view']),
            metric_value: z.number().positive().max(100000),
            occurred_at: z.string().trim().optional(),
            page_path: z.string().trim().max(512).optional(),
            route: z.string().trim().max(512).optional(),
            referrer_host: z.string().trim().max(255).optional(),
            country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
            device_category: z.enum(['mobile', 'desktop', 'tablet', 'unknown']).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
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

function buildIdempotencyFallback(input: {
  provider: 'vercel' | 'firebase';
  sessionId: string;
  visits: Array<{
    provider_event_id?: string;
    metric_name: 'visit' | 'unique_visitor' | 'page_view';
    metric_value: number;
    page_path?: string;
  }>;
}) {
  const normalized = input.visits.map((visit) => ({
    id: visit.provider_event_id ?? '',
    metric: visit.metric_name,
    value: visit.metric_value,
    path: visit.page_path ?? '',
  }));
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        provider: input.provider,
        sessionId: input.sessionId,
        normalized,
      }),
    )
    .digest('hex')
    .slice(0, 40);
  return `idem_traffic_${fingerprint}`;
}

function toPath(value?: string) {
  if (!value) {
    return '/';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '/';
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.pathname || '/';
  } catch {
    return '/';
  }
}

function normalizeCountryCode(value?: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function resolveCountryFromRequest(request: NextRequest) {
  const candidateHeaders = [
    'x-vercel-ip-country',
    'x-country',
    'cf-ipcountry',
  ];

  for (const headerName of candidateHeaders) {
    const value = request.headers.get(headerName);
    const normalized = normalizeCountryCode(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
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
    return jsonApiError(400, 'VALIDATION_ERROR', 'Payload analytics traffic invalide.', {
      issues: parsedBody.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const sourceHeader = parsedBody.data.provider === 'firebase' ? 'firebase' : 'vercel';
  const eventSource = parsedBody.data.provider === 'firebase' ? 'firebase_analytics' : 'vercel_analytics';
  const nowIso = new Date().toISOString();
  const countryFromRequest = resolveCountryFromRequest(request);
  const correlationId = pickHeaderValue(request, 'x-correlation-id', 'corr_traffic');
  const idempotencyKey =
    request.headers.get('x-idempotency-key')?.trim() ||
    buildIdempotencyFallback({
      provider: parsedBody.data.provider,
      sessionId: parsedBody.data.session.session_id,
      visits: parsedBody.data.visits.map((visit) => ({
        provider_event_id: visit.provider_event_id,
        metric_name: visit.metric_name,
        metric_value: visit.metric_value,
        page_path: visit.page_path,
      })),
    });

  const events = parsedBody.data.visits.map((visit) => {
    const occurredAt = visit.occurred_at?.trim() || parsedBody.data.occurred_at?.trim() || nowIso;
    const providerEventId =
      visit.provider_event_id ??
      `locmaison_${visit.metric_name}_${parsedBody.data.session.session_id}_${createHash('sha256')
        .update(`${toPath(visit.page_path)}:${occurredAt}`)
        .digest('hex')
        .slice(0, 16)}`;

    return {
      event_id: `evt_visit_${createHash('sha256').update(providerEventId).digest('hex').slice(0, 24)}`,
      event_name: 'platform_visit',
      schema_version: '1.0.0',
      occurred_at: occurredAt,
      source: eventSource,
      environment: resolveEnvironment(parsedBody.data.environment),
      correlation_id: correlationId,
      actor: {
        actor_type: parsedBody.data.actor?.actor_type ?? 'user',
        actor_id: parsedBody.data.actor?.actor_id ?? undefined,
        is_authenticated: parsedBody.data.actor?.is_authenticated ?? false,
      },
      session: {
        session_id: parsedBody.data.session.session_id,
      },
      payload: {
        provider_event_id: providerEventId,
        metric_name: visit.metric_name,
        metric_value: visit.metric_value,
        page_path: toPath(visit.page_path),
        route: visit.route ?? undefined,
        referrer_host: visit.referrer_host ?? undefined,
        country: normalizeCountryCode(visit.country) ?? countryFromRequest ?? undefined,
        device_category: visit.device_category ?? 'unknown',
      },
    };
  });

  const canonicalBatch = {
    batch_id: `batch_traffic_${randomUUID()}`,
    sent_at: parsedBody.data.sent_at?.trim() || nowIso,
    events,
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
        'X-Analytics-Source': sourceHeader,
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
          message: 'La passerelle analytics traffic n a retourne aucun body.',
        },
      },
      { status: upstreamResponse.status },
    );
    response.headers.set('x-correlation-id', correlationId);
    return response;
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    logger.warn('Traffic analytics forwarder request failed', {
      correlationId,
      ingestUrl,
      isAbort,
      error,
    });

    return jsonApiError(
      isAbort ? 504 : 502,
      isAbort ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE',
      isAbort
        ? 'Timeout lors de l envoi traffic analytics vers location-maison-admin.'
        : 'Echec de forwarding traffic analytics vers location-maison-admin.',
      { correlationId },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
