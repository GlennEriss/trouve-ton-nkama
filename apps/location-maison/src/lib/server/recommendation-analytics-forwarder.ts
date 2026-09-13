import { createLogger } from '@/lib/logger'

const logger = createLogger('recommendation.analytics-forwarder')
const REQUEST_TIMEOUT_MS = 5000

const DEFAULT_DEV_URLS: Record<AdapterKind, string> = {
  requests: 'http://localhost:3001/api/admin/v1/analytics/adapters/recommendations/requests',
  events: 'http://localhost:3001/api/admin/v1/analytics/adapters/recommendations/events',
}

type AdapterKind = 'requests' | 'events'

function resolveAdapterUrl(kind: AdapterKind): string | null {
  const explicit =
    kind === 'requests'
      ? process.env.RECOMMENDATION_REQUESTS_ADAPTER_URL?.trim()
      : process.env.RECOMMENDATION_EVENTS_ADAPTER_URL?.trim()

  if (explicit) return explicit
  if (process.env.NODE_ENV === 'production') return null
  return DEFAULT_DEV_URLS[kind]
}

// Transmission best-effort, non bloquante pour la réponse au client (NFR : « réponse complète
// avec fallback même si le modèle/l'ingestion échoue » — docs/recommendation-ml/architecture/
// ARCHITECTURE-OVERVIEW.md). Un échec ici ne doit jamais remonter comme échec de la requête
// appelante : on logge et on continue.
export async function forwardToRecommendationAnalytics(
  kind: AdapterKind,
  body: Record<string, unknown>,
  correlationId: string,
): Promise<void> {
  const adapterUrl = resolveAdapterUrl(kind)
  const serviceToken = process.env.ANALYTICS_INGEST_TOKEN?.trim()

  if (!adapterUrl || !serviceToken) {
    logger.warn('Recommendation analytics forwarder misconfigured; skipping', {
      kind,
      hasAdapterUrl: Boolean(adapterUrl),
      hasToken: Boolean(serviceToken),
    })
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(adapterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
        'X-Correlation-Id': correlationId,
        'Idempotency-Key': `idem_${correlationId}`,
        'X-Analytics-Source': 'location-maison',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.warn('Recommendation analytics forwarder rejected', {
        kind,
        status: response.status,
        body: text.slice(0, 500),
      })
    }
  } catch (error) {
    logger.warn('Recommendation analytics forwarder request failed', { kind, error })
  } finally {
    clearTimeout(timeoutId)
  }
}
