import {
  IdempotencyKeyError,
  buildScopedIdempotencyDocId,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
  readIdempotencyKey,
} from '@/lib/server/idempotency'

describe('server idempotency helpers', () => {
  it('normalise les cles acceptees', () => {
    expect(normalizeIdempotencyKey('  ad-create:abc_123.456  ')).toBe('ad-create:abc_123.456')
    expect(normalizeIdempotencyKey('')).toBeNull()
    expect(normalizeIdempotencyKey(undefined)).toBeNull()
  })

  it('refuse les cles dangereuses ou trop longues', () => {
    expect(() => normalizeIdempotencyKey('bad key')).toThrow(IdempotencyKeyError)
    expect(() => normalizeIdempotencyKey('../bad')).toThrow(IdempotencyKeyError)
    expect(() => normalizeIdempotencyKey('a'.repeat(129))).toThrow(IdempotencyKeyError)
  })

  it('lit la cle depuis les headers avant le body', () => {
    const headers = new Headers({ 'x-idempotency-key': 'from-header' })

    expect(readIdempotencyKey(headers, { idempotencyKey: 'from-body' })).toBe('from-header')
    expect(readIdempotencyKey(new Headers(), { idempotencyKey: 'from-body' })).toBe('from-body')
  })

  it('genere un document id stable et cloisonne par scope/utilisateur', () => {
    const id = buildScopedIdempotencyDocId('advertising_campaign_create', 'uid-1', 'key-1')

    expect(id).toMatch(/^[a-f0-9]{64}$/)
    expect(buildScopedIdempotencyDocId('advertising_campaign_create', 'uid-1', 'key-1')).toBe(id)
    expect(buildScopedIdempotencyDocId('advertising_campaign_create', 'uid-2', 'key-1')).not.toBe(id)
    expect(buildScopedIdempotencyDocId('other_scope', 'uid-1', 'key-1')).not.toBe(id)
  })

  it('hash le payload pour detecter une reutilisation de cle avec un autre contenu', () => {
    const first = hashIdempotencyPayload({ packageId: 'brand', ctaUrl: 'https://tonnkama.com' })
    const second = hashIdempotencyPayload({ packageId: 'brand', ctaUrl: 'https://example.com' })

    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(first).not.toBe(second)
  })
})
