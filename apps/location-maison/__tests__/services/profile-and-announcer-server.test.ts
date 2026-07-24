import { RepositoryError } from '@/features/auth/repositories/user.repository.interface'
import { CompleteProfileErrorCode } from '@/features/auth/services/complete-profile.service.interface'
import { CompleteProfileServiceImpl } from '@/features/auth/services/complete-profile.service'
import { becomeAnnouncerServerService } from '@/features/users/become-announcer/services/become-announcer-server.service'
import { BecomeAnnouncerErrorCode } from '@/features/users/become-announcer/services/become-announcer.service.interface'

const mockUpdateUser = jest.fn()
const mockFindById = jest.fn()
const mockDirectGet = jest.fn()
const mockQueryGet = jest.fn()
const mockRefUpdate = jest.fn()

jest.mock('@/lib/phoneValidation', () => ({
  validatePhoneNumberForSupportedCountries: (phone: string) => ({ isValid: phone.startsWith('+241') }),
  // Passthrough: le format d'entree des tests (+241...) est deja normalise, seule la
  // presence de la fonction compte ici (complete-profile.service l'appelle desormais pour
  // stocker le numero en E.164 canonique).
  normalizePhoneNumberForFirebase: (phone: string) => phone,
}))
jest.mock('@/features/auth/repositories/user.repository', () => ({
  userRepository: {
    update: (...args: any[]) => mockUpdateUser(...args),
    findById: (...args: any[]) => mockFindById(...args),
  },
}))
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

const validProfile = {
  uid: 'u1', firstname: ' Glenn ', lastname: ' Eriss ', phoneNumber: '+24166545430',
  birthdate: { day: '15', month: '06', year: '1995' }, accountType: 'User' as const,
  acceptTerms: true, acceptAnnouncerTerms: false, metadata: { source: 'google' },
}

describe('CompleteProfileServiceImpl', () => {
  const service = new CompleteProfileServiceImpl()
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindById.mockResolvedValue({ uid: 'u1', phoneNumbers: [], phoneNumberVerified: false })
    mockUpdateUser.mockResolvedValue({ uid: 'u1', firstname: 'Glenn' })
  })

  it('traduit une absence de profil existant en USER_NOT_FOUND', async () => {
    mockFindById.mockResolvedValueOnce(null)
    await expect(service.completeProfile(validProfile)).resolves.toMatchObject({
      success: false,
      error: { code: CompleteProfileErrorCode.USER_NOT_FOUND },
    })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('conserve le statut verifie quand le numero de telephone est inchange', async () => {
    mockFindById.mockResolvedValueOnce({ uid: 'u1', phoneNumbers: ['+24166545430'], phoneNumberVerified: true })
    await service.completeProfile({ ...validProfile, phoneNumber: '+24166545430' })
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', expect.objectContaining({ phoneNumberVerified: true }))
  })

  it('reinitialise le statut verifie quand le numero de telephone change', async () => {
    mockFindById.mockResolvedValueOnce({ uid: 'u1', phoneNumbers: ['+24166540000'], phoneNumberVerified: true })
    await service.completeProfile({ ...validProfile, phoneNumber: '+24166545430' })
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', expect.objectContaining({ phoneNumberVerified: false }))
  })

  it.each([
    [{ ...validProfile, uid: ' ' }, CompleteProfileErrorCode.USER_ID_REQUIRED],
    [{ ...validProfile, phoneNumber: '066' }, CompleteProfileErrorCode.INVALID_PHONE],
    [{ ...validProfile, birthdate: { day: 'x', month: '06', year: '1995' } }, CompleteProfileErrorCode.INVALID_BIRTHDATE],
    [{ ...validProfile, birthdate: { day: '31', month: '02', year: '1995' } }, CompleteProfileErrorCode.INVALID_BIRTHDATE],
    [{ ...validProfile, birthdate: { day: '01', month: '01', year: String(new Date().getFullYear() - 10) } }, CompleteProfileErrorCode.UNDERAGE],
    [{ ...validProfile, acceptTerms: false }, CompleteProfileErrorCode.TERMS_NOT_ACCEPTED],
    [{ ...validProfile, accountType: 'Announcer' as const, acceptAnnouncerTerms: false }, CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED],
  ])('refuse les données invalides avec %s', async (data, code) => {
    await expect(service.completeProfile(data)).resolves.toMatchObject({ success: false, error: { code } })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it.each([
    ['User', ['User']],
    ['Announcer', ['User', 'Announcer']],
  ] as const)('normalise et persiste un profil %s', async (accountType, roles) => {
    const result = await service.completeProfile({ ...validProfile, accountType, acceptAnnouncerTerms: true })
    expect(result).toMatchObject({ success: true, user: { uid: 'u1' } })
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', expect.objectContaining({ firstname: 'Glenn', lastname: 'Eriss', searchableName: 'Glenn Eriss', birthDate: '1995-06-15', roles, metadata: { source: 'google', needsProfileCompletion: false } }))
  })

  it.each([
    [new RepositoryError('missing', 'USER_NOT_FOUND'), CompleteProfileErrorCode.USER_NOT_FOUND],
    [new RepositoryError('write', 'WRITE_FAILED'), CompleteProfileErrorCode.UPDATE_FAILED],
    [new Error('unknown'), CompleteProfileErrorCode.UNKNOWN_ERROR],
  ])('traduit les erreurs du dépôt', async (error, code) => {
    mockUpdateUser.mockRejectedValueOnce(error)
    await expect(service.completeProfile(validProfile)).resolves.toMatchObject({ success: false, error: { code } })
  })
})

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
