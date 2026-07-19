import { randomUUID } from 'node:crypto'

export type IncidentCategory =
  | 'reel_lifecycle'
  | 'reel_processing'
  | 'payment'
  | 'advertising'
  | 'credits'
  | 'api'

const VALID_REQUEST_ID = /^[a-zA-Z0-9._:-]{8,128}$/

type RequestLike = {
  headers: { get(name: string): string | null }
  method?: string
}

export function resolveRequestId(request: RequestLike): string {
  const supplied = request.headers.get('x-request-id')?.trim() ?? ''
  if (VALID_REQUEST_ID.test(supplied)) return supplied

  const vercelId = request.headers.get('x-vercel-id')?.trim() ?? ''
  if (VALID_REQUEST_ID.test(vercelId)) return vercelId

  return randomUUID()
}

export function createRequestLogContext(
  request: RequestLike,
  operation: string,
  incidentCategory: IncidentCategory,
) {
  return {
    requestId: resolveRequestId(request),
    operation,
    incidentCategory,
    method: request.method ?? 'UNKNOWN',
  }
}

export function attachRequestId<T extends { headers?: { set?: (name: string, value: string) => void } }>(
  response: T,
  requestId: string,
): T {
  response.headers?.set?.('x-request-id', requestId)
  return response
}
