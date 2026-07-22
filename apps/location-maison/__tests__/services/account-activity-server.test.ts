import { AccountActivityNotificationServerServiceImpl } from '@/features/users/account-activity-notifications/services/account-activity.server.service'

const mockSendEmail = jest.fn()
const mockIsValidEmail = jest.fn()
const mockCreate = jest.fn()
const mockAdd = jest.fn()
const mockUserGet = jest.fn()

jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin-test' } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/services/email.service', () => ({
  EmailService: {
    isValidEmail: (...args: any[]) => mockIsValidEmail(...args),
    getDefaultFromAddress: () => 'security@tonnkama.com',
  },
  emailService: { sendEmail: (...args: any[]) => mockSendEmail(...args) },
}))
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIME' },
  getFirestore: () => ({
    collection: (name: string) => {
      if (name === 'account_activity_dispatch') return { doc: () => ({ create: mockCreate }) }
      if (name === 'notifications') return { add: mockAdd }
      return { where: () => ({ limit: () => ({ get: mockUserGet }) }) }
    },
  }),
}))

describe('AccountActivityNotificationServerServiceImpl', () => {
  const service = new AccountActivityNotificationServerServiceImpl()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue(undefined)
    mockAdd.mockResolvedValue({ id: 'notification-1' })
    mockSendEmail.mockResolvedValue({ simulated: false, messageId: 'mail-1' })
    mockIsValidEmail.mockReturnValue(true)
    mockUserGet.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ uid: 'u1', email: 'glenn@example.com', firstname: 'Glenn', notificationParameter: { isAccountActivity: true } }) }],
    })
  })

  it('ignore un uid vide avant tout accès Firestore', async () => {
    await expect(service.dispatch({ uid: '  ', eventType: 'ACCOUNT_PROFILE_UPDATED' })).resolves.toMatchObject({ reason: 'missing_uid', success: false })
    expect(mockUserGet).not.toHaveBeenCalled()
  })

  it('déduplique un événement déjà distribué', async () => {
    mockCreate.mockRejectedValueOnce({ code: 'already-exists' })
    await expect(service.dispatch({ uid: 'u1', eventType: 'ACCOUNT_PASSWORD_CHANGED', eventId: 'evt/1' })).resolves.toMatchObject({ reason: 'duplicate_event', success: true })
    expect(mockUserGet).not.toHaveBeenCalled()
  })

  it('propage une panne inattendue du verrou idempotent', async () => {
    mockCreate.mockRejectedValueOnce(new Error('firestore down'))
    await expect(service.dispatch({ uid: 'u1', eventType: 'ACCOUNT_PASSWORD_CHANGED', eventId: 'evt-2' })).rejects.toThrow('firestore down')
  })

  it('ignore un profil introuvable', async () => {
    mockUserGet.mockResolvedValueOnce({ empty: true, docs: [] })
    await expect(service.dispatch({ uid: 'u1', eventType: 'ACCOUNT_PHONE_CHANGED' })).resolves.toMatchObject({ reason: 'user_not_found', skipped: true })
  })

  it.each([
    ['ACCOUNT_PASSWORD_CHANGED', 'Mot de passe modifié'],
    ['ACCOUNT_EMAIL_CHANGED', 'Adresse email modifiée'],
    ['ACCOUNT_PROVIDER_LINKED', 'Méthode de connexion ajoutée'],
    ['ACCOUNT_PROVIDER_UNLINKED', 'Méthode de connexion retirée'],
  ] as const)('envoie les deux canaux critiques pour %s', async (eventType, title) => {
    const result = await service.dispatch({ uid: 'u1', eventType, context: { provider: 'GOOGLE', actionUrl: '/security' } })
    expect(result).toMatchObject({ success: true, severity: 'CRITICAL', channelsSent: ['in_app', 'email'] })
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title, actionUrl: '/security' }))
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'glenn@example.com', subject: expect.stringContaining(title), html: expect.stringContaining('http://localhost:3000/security') }))
  })

  it.each([
    ['ACCOUNT_PHONE_CHANGED', 'Numéro de téléphone modifié'],
    ['ACCOUNT_PHONE_VERIFIED', 'Numéro de téléphone vérifié'],
    ['ACCOUNT_PROFILE_UPDATED', 'Profil mis à jour'],
  ] as const)('envoie seulement la notification interne pour %s', async (eventType, title) => {
    const result = await service.dispatch({ uid: 'u1', eventType, context: { changedFields: ['email', '', 4 as any] } })
    expect(result.channelsSent).toEqual(['in_app'])
    expect(result.channelsSkipped).toEqual(['email'])
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title }))
  })

  it('respecte la préférence désactivée sur une activité non critique', async () => {
    mockUserGet.mockResolvedValueOnce({ empty: false, docs: [{ data: () => ({ uid: 'u1', notificationParameter: { isAccountActivity: false } }) }] })
    await expect(service.dispatch({ uid: 'u1', eventType: 'ACCOUNT_PROFILE_UPDATED' })).resolves.toMatchObject({ success: true, skipped: true, reason: 'account_activity_disabled' })
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('isole les pannes de notification et d’email', async () => {
    mockAdd.mockRejectedValueOnce(new Error('notifications down'))
    mockSendEmail.mockRejectedValueOnce(new Error('smtp down'))
    await expect(service.dispatch({ uid: 'u1', eventType: 'ACCOUNT_PASSWORD_CHANGED' })).resolves.toMatchObject({ success: false, skipped: true, channelsSkipped: ['in_app', 'email'] })
  })

  it('saute un email invalide mais conserve la notification critique', async () => {
    mockIsValidEmail.mockReturnValueOnce(false)
    await expect(service.dispatch({ uid: 'u1', eventType: 'ACCOUNT_EMAIL_CHANGED' })).resolves.toMatchObject({ channelsSent: ['in_app'], channelsSkipped: ['email'] })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
