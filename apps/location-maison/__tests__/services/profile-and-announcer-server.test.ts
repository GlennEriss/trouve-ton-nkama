import { becomeAnnouncerServerService } from '@/features/users/become-announcer/services/become-announcer-server.service'
import { BecomeAnnouncerErrorCode } from '@/features/users/become-announcer/services/become-announcer.service.interface'

const mockDirectGet = jest.fn()
const mockQueryGet = jest.fn()
const mockRefUpdate = jest.fn()

jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIME' },
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({ get: mockDirectGet, update: mockRefUpdate }),
      where: () => ({ limit: () => ({ get: mockQueryGet }) }),
    }),
  }),
}))

describe('becomeAnnouncerServerService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDirectGet.mockResolvedValue({ exists: true, data: () => ({ uid: 'u1', roles: ['User'], metadata: { old: true } }) })
    mockQueryGet.mockResolvedValue({ empty: true, docs: [] })
    mockRefUpdate.mockResolvedValue(undefined)
  })

  it('valide la session et l’acceptation des conditions', async () => {
    await expect(becomeAnnouncerServerService.becomeAnnouncer({ uid: ' ', acceptAnnouncerTerms: true })).resolves.toMatchObject({ error: { code: BecomeAnnouncerErrorCode.UNAUTHENTICATED, status: 401 } })
    await expect(becomeAnnouncerServerService.becomeAnnouncer({ uid: 'u1', acceptAnnouncerTerms: false })).resolves.toMatchObject({ error: { code: BecomeAnnouncerErrorCode.ANNOUNCER_TERMS_REQUIRED } })
  })

  it('utilise le document direct et conserve les rôles administratifs', async () => {
    mockDirectGet.mockResolvedValueOnce({ exists: true, data: () => ({ uid: 'u1', roles: ['Admin', 'User', 'User', 'bad'], metadata: { old: true } }) })
    const result = await becomeAnnouncerServerService.becomeAnnouncer({ uid: 'u1', acceptAnnouncerTerms: true, source: ' publish ' })
    expect(result).toMatchObject({ success: true, code: 'BECOME_ANNOUNCER_SUCCESS', roles: ['User', 'Admin', 'Announcer'], metadata: { old: true, becomeAnnouncerSource: 'publish' } })
    expect(mockRefUpdate).toHaveBeenCalledWith(expect.objectContaining({ roles: ['User', 'Admin', 'Announcer'], updatedAt: 'SERVER_TIME' }))
  })

  it('retrouve les anciens documents par requête uid', async () => {
    const legacyRef = { update: jest.fn().mockResolvedValue(undefined) }
    mockDirectGet.mockResolvedValueOnce({ exists: false })
    mockQueryGet.mockResolvedValueOnce({ empty: false, docs: [{ ref: legacyRef, data: () => ({ uid: 'u1', roles: ['User'] }) }] })
    await expect(becomeAnnouncerServerService.becomeAnnouncer({ uid: 'u1', acceptAnnouncerTerms: true })).resolves.toMatchObject({ success: true })
    expect(legacyRef.update).toHaveBeenCalled()
  })

  it('retourne le rôle existant sans écriture', async () => {
    mockDirectGet.mockResolvedValueOnce({ exists: true, data: () => ({ roles: ['User', 'Announcer'], metadata: null }) })
    await expect(becomeAnnouncerServerService.becomeAnnouncer({ uid: 'u1', acceptAnnouncerTerms: true })).resolves.toMatchObject({ code: 'ALREADY_ANNOUNCER', roles: ['User', 'Announcer'], metadata: {} })
    expect(mockRefUpdate).not.toHaveBeenCalled()
  })

  it('refuse un utilisateur absent ou sans rôle User', async () => {
    mockDirectGet.mockResolvedValueOnce({ exists: false })
    await expect(becomeAnnouncerServerService.becomeAnnouncer({ uid: 'u1', acceptAnnouncerTerms: true })).resolves.toMatchObject({ error: { code: BecomeAnnouncerErrorCode.USER_NOT_FOUND } })
    mockDirectGet.mockResolvedValueOnce({ exists: true, data: () => ({ roles: 'Admin' }) })
    await expect(becomeAnnouncerServerService.becomeAnnouncer({ uid: 'u1', acceptAnnouncerTerms: true })).resolves.toMatchObject({ error: { code: BecomeAnnouncerErrorCode.FORBIDDEN_ROLE_STATE } })
  })

  it('traduit une panne de persistance', async () => {
    mockDirectGet.mockRejectedValueOnce(new Error('firestore'))
    await expect(becomeAnnouncerServerService.becomeAnnouncer({ uid: 'u1', acceptAnnouncerTerms: true })).resolves.toMatchObject({ error: { code: BecomeAnnouncerErrorCode.PERSISTENCE_ERROR, status: 500 } })
  })
})
