export type FunctionIncidentCategory =
  | 'reel_processing'
  | 'payment_callback'
  | 'payment_initiation'
  | 'notification'
  | 'analytics'

export type FunctionIncidentInput = {
  category: FunctionIncidentCategory
  operation: string
  incidentCode?: string
  retryable?: boolean
  requestId?: string | null
  transactionId?: string | null
  reelId?: string | null
  eventId?: string | null
}

export function buildFunctionIncidentContext(input: FunctionIncidentInput) {
  return Object.fromEntries(
    Object.entries({
      incidentCategory: input.category,
      operation: input.operation,
      incidentCode: input.incidentCode,
      retryable: input.retryable,
      requestId: input.requestId,
      transactionId: input.transactionId,
      reelId: input.reelId,
      eventId: input.eventId,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

export function safeHttpRequestContext(req: any) {
  const requestId = firstHeader(req, 'x-request-id')
    || firstHeader(req, 'x-cloud-trace-context')?.split('/')[0]
    || null
  const contentType = firstHeader(req, 'content-type')
  const contentLength = Number(firstHeader(req, 'content-length') ?? 0)

  return {
    requestId,
    method: typeof req?.method === 'string' ? req.method : 'UNKNOWN',
    contentType: contentType?.slice(0, 120) ?? null,
    contentLength: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null,
    hasBody: Boolean(req?.body) || Boolean(req?.rawBody?.length),
    hasQuery: Boolean(req?.query && Object.keys(req.query).length > 0),
  }
}

export function serializeFunctionError(error: unknown) {
  if (error instanceof Error) {
    const code = 'code' in error ? (error as Error & { code?: unknown }).code : undefined
    return {
      name: error.name,
      message: error.message.slice(0, 500),
      ...(typeof code === 'string' || typeof code === 'number' ? { code } : {}),
    }
  }
  return { name: 'UnknownError', message: String(error).slice(0, 500) }
}

function firstHeader(req: any, name: string): string | null {
  const value = req?.headers?.[name]
  if (Array.isArray(value)) return String(value[0] ?? '').trim() || null
  return typeof value === 'string' ? value.trim() || null : null
}
