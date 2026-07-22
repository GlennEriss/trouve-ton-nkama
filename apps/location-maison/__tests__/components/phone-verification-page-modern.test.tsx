import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { PhoneVerificationPageModern } from '@/features/users/phone-verification/ui/v1/PhoneVerificationPageModern'

const setCountryMock = jest.fn()
const setPhoneMock = jest.fn()
const setOtpMock = jest.fn()
const sendMock = jest.fn()
const verifyMock = jest.fn()
const backMock = jest.fn()
const resendMock = jest.fn()

let state: Record<string, any>

jest.mock('@/features/users/phone-verification/hooks', () => ({ usePhoneVerification: () => state }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }: any) => <a href={href}>{children}</a> }))
jest.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }))
jest.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }))
jest.mock('@/components/ui/label', () => ({ Label: ({ children }: any) => <label>{children}</label> }))
jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled }: any) => (
    <select aria-label="Pays" value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}>
      <option value="GA">Gabon</option><option value="SN">Sénégal</option>
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>, SelectItem: ({ children }: any) => <>{children}</>,
  SelectTrigger: ({ children }: any) => <>{children}</>, SelectValue: () => null,
}))

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    user: { uid: 'phone-9c' }, step: 'phone', selectedCountry: 'GA', setSelectedCountry: setCountryMock,
    localPhoneNumber: '066123456', setLocalPhoneNumber: setPhoneMock, fullPhoneNumber: '+24166123456',
    currentPhoneNumber: '+24166123456', enabledCountries: [{ code: 'GA', name: 'Gabon' }, { code: 'SN', name: 'Sénégal' }],
    otpCode: '', setOtpCode: setOtpMock, timeLeft: 125, isLoading: false, isCheckingVerification: false,
    errorMessage: null, canSendOtp: true, canVerifyOtp: false, sendOtp: sendMock, verifyOtp: verifyMock,
    backToPhoneStep: backMock, resendOtp: resendMock, shouldUseVisibleRecaptcha: false,
    isDevOtpFallback: false, devOtpCode: null, devOtpDebugUrl: null, ...overrides,
  }
}

describe('PhoneVerificationPageModern', () => {
  beforeEach(() => { jest.clearAllMocks(); state = baseState() })

  it('affiche le contrôle initial et nettoie les saisies', () => {
    render(<PhoneVerificationPageModern />)
    expect(screen.getAllByText('+24166123456')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Pays'), { target: { value: 'SN' } })
    expect(setCountryMock).toHaveBeenCalledWith('SN')
    fireEvent.change(screen.getByPlaceholderText('66 12 34 56'), { target: { value: '06a6-12' } })
    expect(setPhoneMock).toHaveBeenCalledWith('06612')
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le code OTP' }))
    expect(sendMock).toHaveBeenCalled()
  })

  it('rend la vérification du statut et une session absente', () => {
    state = baseState({ user: null, isCheckingVerification: true, shouldUseVisibleRecaptcha: true })
    const { container } = render(<PhoneVerificationPageModern />)
    expect(screen.getByText('Vérification du statut en cours...')).toBeVisible()
    expect(screen.getByText(/Session indisponible/)).toBeVisible()
    expect(container.querySelector('#verify-phone-recaptcha')).toHaveClass('mt-4')
  })

  it('vérifie et renvoie le code OTP en affichant le mode local', () => {
    state = baseState({ step: 'otp', otpCode: '123456', canVerifyOtp: true, errorMessage: 'Premier code invalide', isDevOtpFallback: true, devOtpCode: '654321', devOtpDebugUrl: 'http://localhost/debug', timeLeft: 65 })
    render(<PhoneVerificationPageModern />)
    expect(screen.getByText('Expire dans 1:05')).toBeVisible()
    expect(screen.getByText('654321')).toBeVisible()
    expect(screen.getByText(/localhost\/debug/)).toBeVisible()
    fireEvent.change(screen.getByPlaceholderText('Saisissez le code SMS'), { target: { value: '12a34' } })
    expect(setOtpMock).toHaveBeenCalledWith('1234')
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier le code' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }))
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer un code OTP' }))
    expect(verifyMock).toHaveBeenCalled(); expect(backMock).toHaveBeenCalled(); expect(resendMock).toHaveBeenCalled()
  })

  it('affiche le succès de vérification', () => {
    state = baseState({ step: 'success' })
    render(<PhoneVerificationPageModern />)
    expect(screen.getByText('Numéro vérifié avec succès')).toBeVisible()
    expect(screen.getByText('+24166123456')).toBeVisible()
  })

  it('affiche un numéro déjà vérifié et l avertissement de changement', () => {
    state = baseState({ step: 'already-verified', currentPhoneNumber: '' })
    render(<PhoneVerificationPageModern />)
    expect(screen.getByText('Numéro déjà vérifié')).toBeVisible()
    expect(screen.getByText('Changement de numéro')).toBeVisible()
  })
})
