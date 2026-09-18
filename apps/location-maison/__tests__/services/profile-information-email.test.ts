import { profileInformationService } from '@/features/users/profile-management/services/profile-information.service'
import { ProfileInformationErrorCode } from '@/features/users/profile-management/services/profile-information.service.interface'

// Bug prod corrigé : un compte inscrit par téléphone (OTP) ne pouvait jamais ajouter d'email —
// le champ était toujours désactivé côté UI ET le schéma zod exigeait un format d'email valide
// même vide, bloquant silencieusement TOUT enregistrement de ce formulaire (pas seulement
// l'email) pour ces comptes. Ces tests couvrent la logique serveur (profile-information.service)
// qui permet désormais d'ajouter un email UNIQUEMENT quand le compte n'en a pas déjà un.
jest.mock('@/features/auth/repositories/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
    findByPhoneNumber: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
  },
}))

jest.mock('@/features/users/account-activity-notifications/services/account-activity.client.service', () => ({
  dispatchAccountActivityFromClient: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

import { userRepository } from '@/features/auth/repositories/user.repository'

const findByIdMock = userRepository.findById as jest.Mock
const findByPhoneNumberMock = userRepository.findByPhoneNumber as jest.Mock
const findByEmailMock = userRepository.findByEmail as jest.Mock
const updateMock = userRepository.update as jest.Mock

function phoneOnlyUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'phone-user-1',
    firstname: 'Glenn',
    lastname: 'Eriss',
    pseudo: '',
    email: '',
    birthDate: '1995-06-15',
    phoneNumbers: ['+24174112233'],
    phoneNumberVerified: true,
    country: { code: 'GA', name: 'Gabon' },
    roles: ['User', 'Announcer'],
    metadata: {},
    ...overrides,
  }
}

const baseUpdateInput = {
  uid: 'phone-user-1',
  firstname: 'Glenn',
  lastname: 'Eriss',
  birthDate: '1995-06-15',
  phoneNumber: '+24174112233',
  countryCode: 'GA',
}

describe('profileInformationService — ajout d\'email pour un compte inscrit par téléphone', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    findByPhoneNumberMock.mockResolvedValue(null)
    findByEmailMock.mockResolvedValue(null)
    updateMock.mockImplementation(async (_uid: string, data: unknown) => ({ ...phoneOnlyUser(), ...(data as object) }))
  })

  it("permet d'ajouter un email quand le compte n'en a pas (cas normal, compte inscrit par téléphone)", async () => {
    findByIdMock.mockResolvedValue(phoneOnlyUser())

    const result = await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      email: 'glenn@example.com',
    })

    expect(result.success).toBe(true)
    expect(findByEmailMock).toHaveBeenCalledWith('glenn@example.com')
    const [, patch] = updateMock.mock.calls[0]
    expect(patch.email).toBe('glenn@example.com')
  })

  it("n'écrit rien et ne casse rien quand l'email est laissé vide (compte téléphone qui n'en veut toujours pas)", async () => {
    findByIdMock.mockResolvedValue(phoneOnlyUser())

    const result = await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      email: '',
    })

    expect(result.success).toBe(true)
    expect(findByEmailMock).not.toHaveBeenCalled()
    const [, patch] = updateMock.mock.calls[0]
    expect(patch.email).toBeUndefined()
  })

  it('refuse un format d\'email invalide sans toucher Firestore', async () => {
    const result = await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      email: 'pas-un-email',
    })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ProfileInformationErrorCode.INVALID_EMAIL)
    expect(findByIdMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('refuse un email déjà utilisé par un autre compte', async () => {
    findByIdMock.mockResolvedValue(phoneOnlyUser())
    findByEmailMock.mockResolvedValue({ uid: 'someone-else', email: 'pris@example.com' })

    const result = await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      email: 'pris@example.com',
    })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ProfileInformationErrorCode.EMAIL_ALREADY_IN_USE)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("un compte qui a déjà un email garde le sien — toute autre valeur envoyée est ignorée côté serveur, pas seulement verrouillée côté UI", async () => {
    findByIdMock.mockResolvedValue(phoneOnlyUser({ email: 'deja-la@example.com' }))

    const result = await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      email: 'autre@example.com',
    })

    expect(result.success).toBe(true)
    // Aucune vérification d'unicité déclenchée : le serveur n'a même pas tenté d'écrire cette
    // valeur, donc pas besoin de la valider comme un nouvel email.
    expect(findByEmailMock).not.toHaveBeenCalled()
    const [, patch] = updateMock.mock.calls[0]
    expect(patch.email).toBeUndefined()
  })
})
