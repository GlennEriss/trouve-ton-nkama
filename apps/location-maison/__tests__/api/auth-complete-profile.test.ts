/**
 * POST /api/auth/complete-profile (2026-08-26).
 *
 * Cette route existe parce que l'ancienne implémentation (complete-profile.service.ts)
 * écrivait Firestore directement depuis le navigateur via le SDK client — qui exige une
 * session Firebase Auth réellement établie côté client. Pour Google (credential Firebase
 * échangé server-side dans le callback NextAuth, jamais dans le navigateur), cette session
 * n'existe jamais : la sauvegarde échouait avec PERMISSION_DENIED, silencieusement rattrapé
 * en "Impossible de sauvegarder votre profil pour le moment." Toute la logique vit maintenant
 * ici, avec un vrai écrit Admin SDK (comme pour phone-auth.service.ts).
 */
let POST: typeof import('@/app/api/auth/complete-profile/route').POST

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/next-auth/auth', () => ({ auth: jest.fn() }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'test-admin-app' } }))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

const mockGet = jest.fn()
const mockUpdate = jest.fn()
const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }))
const mockCollection = jest.fn(() => ({ doc: mockDoc }))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: mockCollection })),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const request = (body: unknown) => ({ json: async () => body }) as any

function existingUser(overrides: Record<string, unknown> = {}) {
  return { uid: 'uid-123', phoneNumbers: [] as string[], phoneNumberVerified: false, metadata: {}, ...overrides }
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    firstname: 'Loddy',
    lastname: 'Kiss',
    phoneNumber: '+24174533664',
    birthdate: { day: '01', month: '01', year: '1995' },
    accountType: 'Announcer',
    acceptTerms: true,
    acceptAnnouncerTerms: true,
    ...overrides,
  }
}

describe('POST /api/auth/complete-profile', () => {
  const mockAuth = require('@/next-auth/auth').auth as jest.Mock

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/auth/complete-profile/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { uid: 'uid-123' } })
    mockGet.mockResolvedValue({ exists: true, data: () => existingUser() })
    mockUpdate.mockResolvedValue(undefined)
  })

  it('rejette une requête sans session (401), jamais un uid fourni par le client', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await POST(request({ ...validBody(), uid: 'uid-attaquant' }))

    expect(response.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("ignore tout uid transmis dans le corps : seule la session fait foi", async () => {
    await POST(request({ ...validBody(), uid: 'uid-usurpe' }))

    expect(mockDoc).toHaveBeenCalledWith('uid-123')
    expect(mockDoc).not.toHaveBeenCalledWith('uid-usurpe')
  })

  it('enregistre le pseudo et distingue appel et WhatsApp', async () => {
    const response = await POST(request(validBody({ pseudo: "  kiss&sis'shop  ", whatsappNumber: '+24160010727' })))
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      pseudo: "kiss&sis'shop",
      callNumber: '+24174533664',
      whatsappNumber: '+24160010727',
      // phoneNumbers doit garder les deux numéros, sinon findByPhoneNumber (array-contains) ne
      // reconnaît pas un annonceur contacté sur son WhatsApp.
      phoneNumbers: ['+24174533664', '+24160010727'],
      updatedAt: 'SERVER_TIMESTAMP',
    }))
  })

  it('reprend le numero d appel quand WhatsApp est vide', async () => {
    const response = await POST(request(validBody({ whatsappNumber: '' })))
    const payload = await response.json()

    expect(payload.success).toBe(true)
    const patch = mockUpdate.mock.calls[0][0]
    expect(patch.phoneNumbers).toEqual(['+24174533664'])
    expect(patch.whatsappNumber).toBe('+24174533664')
  })

  it("n'écrit pas de pseudo vide", async () => {
    await POST(request(validBody({ pseudo: '   ' })))

    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('pseudo')
  })

  it('refuse un numero WhatsApp invalide', async () => {
    const response = await POST(request(validBody({ whatsappNumber: '12' })))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('INVALID_WHATSAPP')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('conserve la verification OTP quand le numero d appel ne change pas', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => existingUser({ phoneNumbers: ['+24174533664'], phoneNumberVerified: true }),
    })

    await POST(request(validBody({ whatsappNumber: '+24160010727' })))

    // L'ajout d'un numéro WhatsApp ne doit pas invalider l'OTP du numéro d'appel.
    expect(mockUpdate.mock.calls[0][0].phoneNumberVerified).toBe(true)
  })

  it('réinitialise le statut vérifié quand le numéro d appel change', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => existingUser({ phoneNumbers: ['+24166540000'], phoneNumberVerified: true }),
    })

    await POST(request(validBody({ phoneNumber: '+24174533664' })))

    expect(mockUpdate.mock.calls[0][0].phoneNumberVerified).toBe(false)
  })

  it('normalise et persiste un profil User (pas Announcer)', async () => {
    const response = await POST(request(validBody({ accountType: 'User', acceptAnnouncerTerms: false })))
    const payload = await response.json()

    expect(payload.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ roles: ['User'] }))
  })

  it('refuse un numéro de téléphone invalide', async () => {
    const response = await POST(request(validBody({ phoneNumber: '066' })))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('INVALID_PHONE')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('refuse une date de naissance malformée', async () => {
    const response = await POST(request(validBody({ birthdate: { day: '31', month: '02', year: '1995' } })))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('INVALID_BIRTHDATE')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("refuse un compte Announcer sans acceptation des conditions annonceur", async () => {
    const response = await POST(request(validBody({ accountType: 'Announcer', acceptAnnouncerTerms: false })))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('ANNOUNCER_TERMS_NOT_ACCEPTED')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("répond proprement (pas de crash) quand l'écriture Firestore échoue", async () => {
    mockUpdate.mockRejectedValue(new Error('firestore down'))

    const response = await POST(request(validBody()))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.error.code).toBe('UNKNOWN_ERROR')
  })

  it('refuse un profil sous-âge', async () => {
    const response = await POST(request(validBody({ birthdate: { day: '01', month: '01', year: String(new Date().getFullYear() - 10) } })))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('UNDERAGE')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("refuse quand les conditions d'utilisation ne sont pas acceptées", async () => {
    const response = await POST(request(validBody({ acceptTerms: false })))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('TERMS_NOT_ACCEPTED')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("renvoie USER_NOT_FOUND si le document Firestore n'existe pas", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined })

    const response = await POST(request(validBody()))
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error.code).toBe('USER_NOT_FOUND')
  })
})
