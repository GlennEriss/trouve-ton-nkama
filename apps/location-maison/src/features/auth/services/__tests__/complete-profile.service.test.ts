const mockFindById = jest.fn()
const mockUpdate = jest.fn()

jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findById: (...args: unknown[]) => mockFindById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

import { CompleteProfileServiceImpl } from '../complete-profile.service'
import { CompleteProfileErrorCode } from '../complete-profile.service.interface'
import type { CompleteProfileData } from '../complete-profile.service.interface'

const service = new CompleteProfileServiceImpl()

function validData(overrides: Partial<CompleteProfileData> = {}): CompleteProfileData {
  return {
    uid: 'uid-123',
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

describe('CompleteProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindById.mockResolvedValue({ uid: 'uid-123', phoneNumbers: [], phoneNumberVerified: false })
    mockUpdate.mockImplementation((_uid: string, patch: Record<string, unknown>) => ({ uid: 'uid-123', ...patch }))
  })

  it('enregistre le pseudo et distingue appel et WhatsApp', async () => {
    const result = await service.completeProfile(
      validData({ pseudo: "  kiss&sis'shop  ", whatsappNumber: '+24160010727' }),
    )

    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith('uid-123', expect.objectContaining({
      pseudo: "kiss&sis'shop",
      callNumber: '+24174533664',
      whatsappNumber: '+24160010727',
      // phoneNumbers doit garder les deux numéros, sinon findByPhoneNumber (array-contains) ne
      // reconnaît pas un annonceur contacté sur son WhatsApp.
      phoneNumbers: ['+24174533664', '+24160010727'],
    }))
  })

  it('reprend le numero d appel quand WhatsApp est vide', async () => {
    const result = await service.completeProfile(validData({ whatsappNumber: '' }))

    expect(result.success).toBe(true)
    const patch = mockUpdate.mock.calls[0][1] as any
    expect(patch.phoneNumbers).toEqual(['+24174533664'])
    expect(patch.whatsappNumber).toBe('+24174533664')
  })

  it('n ecrit pas de pseudo vide', async () => {
    // Sans ce garde-fou, repasser par ce parcours effacerait un pseudo déjà choisi.
    await service.completeProfile(validData({ pseudo: '   ' }))

    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('pseudo')
  })

  it('refuse un numero WhatsApp invalide', async () => {
    const result = await service.completeProfile(validData({ whatsappNumber: '12' }))

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(CompleteProfileErrorCode.INVALID_WHATSAPP)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('conserve la verification OTP quand le numero d appel ne change pas', async () => {
    mockFindById.mockResolvedValue({
      uid: 'uid-123',
      phoneNumbers: ['+24174533664'],
      phoneNumberVerified: true,
    })

    await service.completeProfile(validData({ whatsappNumber: '+24160010727' }))

    // L'ajout d'un numéro WhatsApp ne doit pas invalider l'OTP du numéro d'appel.
    expect((mockUpdate.mock.calls[0][1] as any).phoneNumberVerified).toBe(true)
  })
})
