import { createHash } from 'node:crypto'

export const IDEMPOTENCY_KEY_MAX_LENGTH = 128

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/

export class IdempotencyKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IdempotencyKeyError'
  }
}

export function normalizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const key = value.trim()
  if (!key) return null
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new IdempotencyKeyError("La clé d'idempotence est trop longue.")
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new IdempotencyKeyError("La clé d'idempotence est invalide.")
  }

  return key
}

export function readIdempotencyKey(headers: Headers, body?: Record<string, unknown>): string | null {
  return (
    normalizeIdempotencyKey(headers.get('idempotency-key')) ??
    normalizeIdempotencyKey(headers.get('x-idempotency-key')) ??
    normalizeIdempotencyKey(body?.idempotencyKey)
  )
}

export function buildScopedIdempotencyDocId(scope: string, uid: string, key: string): string {
  return createHash('sha256').update(`${scope}:${uid}:${key}`).digest('hex')
}

export function hashIdempotencyPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
