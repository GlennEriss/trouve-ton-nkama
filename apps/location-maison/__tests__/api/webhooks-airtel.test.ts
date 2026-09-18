export {};
let POST: typeof import('@/app/api/webhooks/airtel/route').POST
let GET: typeof import('@/app/api/webhooks/airtel/route').GET

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))

// Route désactivée (faille de sécurité corrigée : signature jamais vérifiée + aucune garde
// d'idempotence permettait de rejouer un id de credit_transactions connu pour se créditer en
// boucle sans payer — voir commentaire d'en-tête de route.ts). Aucune raison de mocker Firestore
// ici : la route ne doit plus jamais y toucher, quel que soit l'appel.
describe('/api/webhooks/airtel (désactivé)', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/webhooks/airtel/route')
    POST = mod.POST
    GET = mod.GET
  })

  it('GET renvoie 410 (route désactivée)', async () => {
    const response = await GET()
    expect(response.status).toBe(410)
  })

  it("POST renvoie 410 sans jamais toucher Firestore, quel que soit le payload envoyé (y compris un rejeu d'ancienne transaction SUCCESS)", async () => {
    const response = await POST()
    expect(response.status).toBe(410)
    expect(await response.json()).toMatchObject({ error: expect.any(String) })
  })
})
