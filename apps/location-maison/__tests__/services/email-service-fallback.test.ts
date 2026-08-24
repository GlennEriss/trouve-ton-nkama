/**
 * Repli SMTP (2026-08-18) : la boîte principale contact@tonnkama.com peut être coupée
 * (facture impayée) — ces tests verrouillent le fait qu'un email part quand même via le
 * SMTP de secours, et surtout que l'expéditeur est réécrit avec l'adresse du transport
 * réellement utilisé (sinon Gmail rejette l'envoi ou casse SPF/DKIM).
 */
const sendMailMock = jest.fn()
const createTransportMock = jest.fn()

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: (...args: unknown[]) => createTransportMock(...args) },
}))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

const OPTIONS = {
  from: '"Trouve Ton Nkama" <contact@tonnkama.com>',
  to: 'client@example.com',
  subject: 'Vérifiez votre adresse email',
  html: '<p>hello</p>',
  text: 'hello',
}

async function freshService() {
  jest.resetModules()
  const mod = await import('@/services/email.service')
  return new mod.EmailService()
}

describe('EmailService — repli SMTP', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      EMAIL_DISPLAY_NAME: 'Trouve Ton Nkama',
      HOSTINGER_EMAIL_USER: 'contact@tonnkama.com',
      HOSTINGER_EMAIL_PASS: 'mauvais-mot-de-passe',
      FALLBACK_EMAIL_USER: 'secours@gmail.com',
      FALLBACK_EMAIL_PASS: 'app-password',
    } as NodeJS.ProcessEnv
    createTransportMock.mockReturnValue({ sendMail: sendMailMock })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('utilise le SMTP principal quand il fonctionne, sans toucher au secours', async () => {
    sendMailMock.mockResolvedValueOnce({ messageId: 'id-1', accepted: [OPTIONS.to], rejected: [] })
    const service = await freshService()

    const result = await service.sendEmail(OPTIONS)

    expect(result.usedFallback).toBe(false)
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.hostinger.com' }),
    )
    expect(sendMailMock.mock.calls[0][0].from).toBe('"Trouve Ton Nkama" <contact@tonnkama.com>')
  })

  it("bascule sur le secours quand le principal echoue, et reecrit l'expediteur", async () => {
    const authError = Object.assign(new Error('Invalid login: 535 5.7.8'), { code: 'EAUTH' })
    sendMailMock
      .mockRejectedValueOnce(authError)
      .mockResolvedValueOnce({ messageId: 'id-2', accepted: [OPTIONS.to], rejected: [] })
    const service = await freshService()

    const result = await service.sendEmail(OPTIONS)

    expect(result.usedFallback).toBe(true)
    expect(result.messageId).toBe('id-2')
    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.gmail.com' }))
    // L'expéditeur DOIT devenir l'adresse Gmail authentifiée, pas contact@tonnkama.com.
    expect(sendMailMock.mock.calls[1][0].from).toBe('"Trouve Ton Nkama" <secours@gmail.com>')
  })

  it('remonte une erreur explicite quand aucun secours n est configure', async () => {
    delete process.env.FALLBACK_EMAIL_USER
    delete process.env.FALLBACK_EMAIL_PASS
    sendMailMock.mockRejectedValueOnce(new Error('smtp down'))
    const service = await freshService()

    await expect(service.sendEmail(OPTIONS)).rejects.toThrow(/aucun SMTP de secours/)
    expect(sendMailMock).toHaveBeenCalledTimes(1)
  })

  it('remonte une erreur quand les DEUX transports echouent', async () => {
    sendMailMock
      .mockRejectedValueOnce(new Error('principal down'))
      .mockRejectedValueOnce(new Error('secours down'))
    const service = await freshService()

    await expect(service.sendEmail(OPTIONS)).rejects.toThrow(/principal ET le SMTP de secours/)
    expect(sendMailMock).toHaveBeenCalledTimes(2)
  })

  it('ne tente aucun envoi reel en dev sans FORCE_REAL_EMAILS', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.FORCE_REAL_EMAILS
    const service = await freshService()

    const result = await service.sendEmail(OPTIONS)

    expect(result.simulated).toBe(true)
    expect(sendMailMock).not.toHaveBeenCalled()
  })
})
