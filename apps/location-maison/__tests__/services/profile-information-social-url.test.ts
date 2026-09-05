import { profileInformationService } from '@/features/users/profile-management/services/profile-information.service'

jest.mock('@/features/auth/repositories/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
    findByPhoneNumber: jest.fn(),
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
const updateMock = userRepository.update as jest.Mock

function announcerUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'announcer-1',
    firstname: 'Glenn',
    lastname: 'Eriss',
    pseudo: '',
    birthDate: '1995-06-15',
    phoneNumbers: ['+24174112233'],
    phoneNumberVerified: false,
    country: { code: 'GA', name: 'Gabon' },
    roles: ['User', 'Announcer'],
    metadata: {},
    ...overrides,
  }
}

const baseUpdateInput = {
  uid: 'announcer-1',
  firstname: 'Glenn',
  lastname: 'Eriss',
  birthDate: '1995-06-15',
  phoneNumber: '+24174112233',
  countryCode: 'GA',
}

describe('profileInformationService — dérivation du lien réseau social depuis le @', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    findByPhoneNumberMock.mockResolvedValue(null)
    updateMock.mockImplementation(async (_uid: string, data: unknown) => ({ ...announcerUser(), ...(data as object) }))
  })

  it("genere l'URL a partir du seul @ fourni, par reseau", async () => {
    findByIdMock.mockResolvedValue(announcerUser())

    await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      socialProfiles: {
        facebook: { handle: 'nkama' },
        instagram: { handle: '@nkama.gabon' },
        tiktok: { handle: 'nkama' },
        linkedin: { handle: 'nkama' },
        x: { handle: 'nkama' },
      },
    })

    expect(updateMock).toHaveBeenCalledTimes(1)
    const [, patch] = updateMock.mock.calls[0]
    const socialProfiles = (patch.metadata as any).socialProfiles

    expect(socialProfiles.facebook).toEqual({ url: 'https://facebook.com/nkama', handle: '@nkama' })
    expect(socialProfiles.instagram).toEqual({ url: 'https://instagram.com/nkama.gabon', handle: '@nkama.gabon' })
    // TikTok inclut le "@" dans le chemin de l'URL, contrairement aux autres reseaux.
    expect(socialProfiles.tiktok).toEqual({ url: 'https://tiktok.com/@nkama', handle: '@nkama' })
    expect(socialProfiles.linkedin).toEqual({ url: 'https://linkedin.com/in/nkama', handle: '@nkama' })
    expect(socialProfiles.x).toEqual({ url: 'https://x.com/nkama', handle: '@nkama' })
  })

  it("garde une URL explicite fournie plutot que de l'ecraser par la derivation", async () => {
    findByIdMock.mockResolvedValue(announcerUser())

    await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      socialProfiles: {
        linkedin: { handle: 'nkama', url: 'https://linkedin.com/in/nkama-officiel-gabon' },
      },
    })

    const [, patch] = updateMock.mock.calls[0]
    expect((patch.metadata as any).socialProfiles.linkedin).toEqual({
      url: 'https://linkedin.com/in/nkama-officiel-gabon',
      handle: '@nkama',
    })
  })

  it('ignore les reseaux sociaux pour un utilisateur non-annonceur', async () => {
    findByIdMock.mockResolvedValue(announcerUser({ roles: ['User'] }))

    await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      socialProfiles: { facebook: { handle: 'nkama' } },
    })

    const [, patch] = updateMock.mock.calls[0]
    expect((patch.metadata as any).socialProfiles).toBeUndefined()
  })

  it("n'ecrit rien pour un reseau sans handle ni URL valide", async () => {
    findByIdMock.mockResolvedValue(announcerUser())

    await profileInformationService.updateProfileInformation({
      ...baseUpdateInput,
      socialProfiles: { facebook: { handle: '' } },
    })

    const [, patch] = updateMock.mock.calls[0]
    expect((patch.metadata as any).socialProfiles).toBeUndefined()
  })
})
