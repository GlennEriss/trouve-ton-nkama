/** @jest-environment node */

import { resolveStatisticsActor } from '@/lib/server/statistics-actor'

function requestWithHeaders(headers: Record<string, string> = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return {
    headers: {
      get: (name: string) => normalized.get(name.toLowerCase()) ?? null,
    },
  } as Pick<Request, 'headers'>
}

describe('resolveStatisticsActor', () => {
  it('produit un identifiant stable et opaque depuis le visitorId', () => {
    const request = requestWithHeaders({ 'x-forwarded-for': '196.0.0.1' })
    const first = resolveStatisticsActor(request, 'ttn_visitor_lot6c_123')
    const second = resolveStatisticsActor(request, 'ttn_visitor_lot6c_123')

    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{32}$/)
    expect(first).not.toContain('visitor')
    expect(first).not.toContain('196.0.0.1')
  })

  it('utilise une empreinte de requete quand le visitorId est invalide', () => {
    const first = resolveStatisticsActor(requestWithHeaders({
      'x-forwarded-for': '196.0.0.1, 10.0.0.1',
      'user-agent': 'Lot6C browser',
      'accept-language': 'fr-GA',
    }), 'court')
    const second = resolveStatisticsActor(requestWithHeaders({
      'x-forwarded-for': '196.0.0.2',
      'user-agent': 'Lot6C browser',
      'accept-language': 'fr-GA',
    }))

    expect(first).toMatch(/^[a-f0-9]{32}$/)
    expect(first).not.toBe(second)
  })
})
