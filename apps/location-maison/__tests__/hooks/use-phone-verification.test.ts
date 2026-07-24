import { act, renderHook, waitFor } from '@testing-library/react'

import { usePhoneVerification } from '@/features/users/phone-verification/hooks/usePhoneVerification'
import { phoneVerificationService } from '@/features/users/phone-verification/services'

const toastMock = jest.fn()
const setUserMock = jest.fn()
const updateSessionMock = jest.fn()
const recaptchaRenderMock = jest.fn()
const recaptchaVerifyMock = jest.fn()
const recaptchaClearMock = jest.fn()

let mockUser: Record<string, any> | null
let mockSession: Record<string, unknown> | null

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockUser, setUser: setUserMock }),
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, update: updateSessionMock }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock('@/firebase/auth', () => ({
  auth: { currentUser: { uid: 'firebase-phone-9c' } },
}))

jest.mock('firebase/auth', () => ({
  RecaptchaVerifier: jest.fn(() => ({
    render: recaptchaRenderMock,
    verify: recaptchaVerifyMock,
    clear: recaptchaClearMock,
  })),
}))

jest.mock('@/features/users/phone-verification/services', () => ({
  phoneVerificationService: {
    getPhoneVerificationStatus: jest.fn(),
    sendPhoneOtp: jest.fn(),
    confirmPhoneOtp: jest.fn(),
  },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

const statusMock = phoneVerificationService.getPhoneVerificationStatus as jest.Mock
const sendOtpMock = phoneVerificationService.sendPhoneOtp as jest.Mock
const confirmOtpMock = phoneVerificationService.confirmPhoneOtp as jest.Mock

describe('usePhoneVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUser = { uid: 'user-phone-9c', phoneNumbers: ['+24166545430'], phoneNumberVerified: false }
    mockSession = { user: mockUser }
    statusMock.mockResolvedValue({ success: true, phoneNumberVerified: false })
    recaptchaRenderMock.mockResolvedValue(1)
    recaptchaVerifyMock.mockResolvedValue('recaptcha-token')
    sendOtpMock.mockResolvedValue({
      success: true,
      confirmationResult: { verificationId: 'verification-phone-9c', confirm: jest.fn() },
    })
    confirmOtpMock.mockResolvedValue({
      success: true,
      user: { ...mockUser, phoneNumberVerified: true },
      isPhoneChanged: false,
    })
    updateSessionMock.mockResolvedValue(undefined)
    window.history.replaceState({}, '', 'http://localhost/verify-phone')
  })

  it('hydrate le numéro du profil et expose les capacités initiales', async () => {
    const { result } = renderHook(() => usePhoneVerification())
    await waitFor(() => expect(result.current.isCheckingVerification).toBe(false))
    expect(result.current.step).toBe('phone')
    expect(result.current.selectedCountry).toBe('GA')
    expect(result.current.localPhoneNumber).toBe('66545430')
    expect(result.current.fullPhoneNumber).toBe('+24166545430')
    expect(result.current.canSendOtp).toBe(true)
    expect(result.current.canVerifyOtp).toBe(false)
  })

  it('gère un utilisateur absent, un statut en erreur et un numéro déjà vérifié', async () => {
    mockUser = null
    const { result, rerender } = renderHook(() => usePhoneVerification())
    await waitFor(() => expect(result.current.isCheckingVerification).toBe(false))

    mockUser = { uid: 'user-phone-error', phoneNumbers: [] }
    statusMock.mockResolvedValueOnce({ success: false, error: { message: 'Statut indisponible' } })
    rerender()
    await waitFor(() => expect(result.current.errorMessage).toBe('Statut indisponible'))

    mockUser = { uid: 'user-phone-verified', phoneNumbers: ['+24166545430'] }
    statusMock.mockResolvedValueOnce({ success: true, phoneNumberVerified: true, phoneNumber: '+24166545430' })
    rerender()
    await waitFor(() => expect(result.current.step).toBe('already-verified'))
  })

  it('envoie un OTP, nettoie le captcha et permet de revenir au numéro', async () => {
    const { result, unmount } = renderHook(() => usePhoneVerification())
    await waitFor(() => expect(result.current.isCheckingVerification).toBe(false))
    await act(async () => { await result.current.sendOtp() })

    expect(sendOtpMock).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: '+24166545430' }))
    expect(result.current.step).toBe('otp')
    expect(result.current.timeLeft).toBe(600)
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Code envoyé' }))

    act(() => result.current.backToPhoneStep())
    expect(result.current.step).toBe('phone')
    expect(result.current.otpCode).toBe('')
    unmount()
    expect(recaptchaClearMock).toHaveBeenCalled()
  })

  it('affiche les erreurs fonctionnelles et inattendues pendant l envoi', async () => {
    sendOtpMock.mockResolvedValueOnce({ success: false, error: { message: 'Numéro invalide', code: 'INVALID_PHONE' } })
    const { result } = renderHook(() => usePhoneVerification())
    await waitFor(() => expect(result.current.isCheckingVerification).toBe(false))
    await act(async () => { await result.current.sendOtp() })
    expect(result.current.errorMessage).toBe('Numéro invalide')
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Echec envoi OTP' }))

    recaptchaRenderMock.mockRejectedValueOnce(new Error('captcha offline'))
    await act(async () => { await result.current.sendOtp() })
    expect(result.current.errorMessage).toContain("Impossible d'envoyer")
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erreur OTP' }))
  })

  it('vérifie l OTP, actualise le profil et la session', async () => {
    const { result } = renderHook(() => usePhoneVerification())
    await waitFor(() => expect(result.current.isCheckingVerification).toBe(false))
    await act(async () => { await result.current.sendOtp() })
    act(() => result.current.setOtpCode('123456'))
    expect(result.current.canVerifyOtp).toBe(true)
    await act(async () => { await result.current.verifyOtp() })

    expect(confirmOtpMock).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'user-phone-9c', otpCode: '123456', phoneNumber: '+24166545430',
    }))
    expect(setUserMock).toHaveBeenCalledWith(expect.objectContaining({ phoneNumberVerified: true }))
    expect(updateSessionMock).toHaveBeenCalled()
    expect(result.current.step).toBe('success')
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Numéro vérifié' }))
  })

  it('signale un OTP invalide et tolère un rafraîchissement de session en échec', async () => {
    confirmOtpMock.mockResolvedValueOnce({ success: false, error: { message: 'Code incorrect' } })
    const { result } = renderHook(() => usePhoneVerification())
    await waitFor(() => expect(result.current.isCheckingVerification).toBe(false))
    await act(async () => { await result.current.sendOtp() })
    act(() => result.current.setOtpCode('000000'))
    await act(async () => { await result.current.verifyOtp() })
    expect(result.current.errorMessage).toBe('Code incorrect')
    expect(result.current.step).toBe('otp')

    confirmOtpMock.mockResolvedValueOnce({
      success: true,
      user: { ...mockUser, phoneNumberVerified: true },
      isPhoneChanged: true,
    })
    updateSessionMock.mockRejectedValueOnce(new Error('session offline'))
    act(() => result.current.setOtpCode('123456'))
    await act(async () => { await result.current.verifyOtp() })
    expect(result.current.step).toBe('success')
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Numéro modifié et vérifié' }))
  })

  it('expire le code après dix minutes', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => usePhoneVerification())
    await act(async () => { await Promise.resolve() })
    await act(async () => { await result.current.sendOtp() })
    act(() => { jest.advanceTimersByTime(600_000) })
    await waitFor(() => expect(result.current.step).toBe('phone'))
    expect(result.current.errorMessage).toContain('expiré')
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Code expiré' }))
    jest.useRealTimers()
  })
})
