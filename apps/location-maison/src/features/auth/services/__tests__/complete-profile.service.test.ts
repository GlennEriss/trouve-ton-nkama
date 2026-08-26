/**
 * complete-profile.service.ts est maintenant un simple client fetch vers
 * POST /api/auth/complete-profile (toute la validation + l'écriture Admin SDK vivent côté
 * serveur, voir __tests__/api/auth-complete-profile.test.ts). Ici on ne teste que la
 * traduction requête/réponse.
 */
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

describe('CompleteProfileServiceImpl (client)', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('poste les données et renvoie le user en cas de succès', async () => {
    const updatedUser = { uid: 'uid-123', firstname: 'Loddy' }
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: updatedUser }),
    })

    const result = await service.completeProfile(validData())

    expect(fetch).toHaveBeenCalledWith('/api/auth/complete-profile', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(result).toEqual({ success: true, user: updatedUser })
  })

  it("traduit une réponse d'erreur de l'API", async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: { code: 'INVALID_WHATSAPP', message: 'Le numéro WhatsApp est invalide' } }),
    })

    const result = await service.completeProfile(validData({ whatsappNumber: '12' }))

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(CompleteProfileErrorCode.INVALID_WHATSAPP)
  })

  it('renvoie une erreur réseau si le fetch échoue (offline, timeout...)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network down'))

    const result = await service.completeProfile(validData())

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(CompleteProfileErrorCode.UNKNOWN_ERROR)
  })
})
