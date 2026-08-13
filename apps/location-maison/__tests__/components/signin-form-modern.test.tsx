import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SigninFormModern } from '@/features/auth/ui/v1/SigninFormModern'

const pushMock = jest.fn()
const replaceMock = jest.fn()
const toastMock = jest.fn()
const credentialsMock = jest.fn()
const googleMock = jest.fn()
const clearErrorMock = jest.fn()
const trackMock = jest.fn()
const mapErrorMock = jest.fn((_error?: string) => ({ code: 'signin_error', title: 'Connexion impossible', message: 'Vérifiez vos informations', duration: 6000 }))

let authState: Record<string, any>
let queryError: string | null

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: () => queryError }),
}))
jest.mock('@/features/auth/hooks', () => ({
  useSignin: () => authState,
  mapSigninError: (error?: string) => mapErrorMock(error),
}))
// PhoneAuthModal importe ce hook par son chemin direct (pas via le barrel ci-dessus),
// et le hook réel tire next-auth/react (ESM non transformé par Jest) — on le mocke ici
// pour garder ce test concentré sur SigninFormModern, pas sur le flux OTP téléphone.
jest.mock('@/features/auth/hooks/usePhoneOtpAuth', () => ({
  usePhoneOtpAuth: () => ({
    step: 'phone',
    phone: '',
    isSending: false,
    isVerifying: false,
    error: null,
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    reset: jest.fn(),
  }),
}))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_AUTH_SIGNIN_CLICK: 'signin-click', BUSINESS_AUTH_SIGNIN_SUCCESS: 'signin-success', CTA_AUTH_GOOGLE_CLICK: 'google-click' },
  useTrackEvent: () => ({ trackEvent: trackMock }),
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn() }) }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }))
jest.mock('@/components/logo/Logo', () => ({ __esModule: true, default: () => <span>Logo</span> }))
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_target, tag) => ({ children, ...props }: any) => React.createElement(tag as string, Object.fromEntries(Object.entries(props).filter(([key]) => !['animate', 'transition', 'initial', 'variants', 'custom', 'whileHover'].includes(key))), children) }) }))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))
jest.mock('@trouve-ton-nkama/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }))
jest.mock('@/components/shared/ui/ButtonApp', () => ({ ButtonApp: ({ title, isLoading: _loading, ...props }: any) => <button {...props}>{title}</button> }))

jest.mock('react-hook-form', () => {
  const R = require('react') as typeof React
  return { useForm: ({ defaultValues }: any) => {
    const [values, setValues] = R.useState(defaultValues)
    const control = { values, setValue: (name: string, value: string) => setValues((old: any) => ({ ...old, [name]: value })) }
    return { control, handleSubmit: (callback: any) => (event: React.FormEvent) => { event.preventDefault(); return callback(values) } }
  } }
})
jest.mock('@/components/shared/form/InputFormApp', () => ({ InputFormApp: ({ control, name, label, type }: any) => <label>{label}<input aria-label={label} type={type} value={control.values[name]} onChange={(event) => control.setValue(name, event.target.value)} /></label> }))

describe('SigninFormModern', () => {
  beforeEach(() => {
    jest.clearAllMocks(); queryError = null
    authState = { signinWithCredentials: credentialsMock, signinWithGoogle: googleMock, isCredentialsLoading: false, isGoogleLoading: false, isLoading: false, lastError: null, clearError: clearErrorMock }
    credentialsMock.mockResolvedValue({ success: true, redirectTo: '/property' })
    googleMock.mockResolvedValue(undefined)
  })

  it('affiche une erreur provenant de l URL puis nettoie l adresse', () => {
    queryError = 'wrong_provider'
    render(<SigninFormModern />)
    expect(mapErrorMock).toHaveBeenCalledWith('wrong_provider')
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Connexion impossible' }))
    expect(replaceMock).toHaveBeenCalled()
  })

  it('refuse un formulaire invalide avant le service', async () => {
    render(<SigninFormModern />)
    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }).closest('form')!)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })))
    expect(credentialsMock).not.toHaveBeenCalled()
  })

  it('connecte par identifiants et redirige vers le parcours métier', async () => {
    render(<SigninFormModern />)
    fireEvent.change(screen.getByLabelText('Adresse email'), { target: { value: 'glenn@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'MotDePasse123!' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }).closest('form')!)
    await waitFor(() => expect(credentialsMock).toHaveBeenCalledWith({ email: 'glenn@example.com', password: 'MotDePasse123!' }))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Connexion réussie' }))
    expect(trackMock).toHaveBeenCalledWith('signin-success', { method: 'credentials' })
    expect(pushMock).toHaveBeenCalledWith('/property')
  })

  it('affiche l erreur renvoyée par le service', async () => {
    credentialsMock.mockResolvedValue({ success: false, error: { title: 'Compte bloqué', message: 'Réessayez plus tard', duration: 7000 } })
    render(<SigninFormModern />)
    fireEvent.change(screen.getByLabelText('Adresse email'), { target: { value: 'glenn@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'MotDePasse123!' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }).closest('form')!)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Compte bloqué' })))
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('affiche l erreur tardive du hook et lance Google', async () => {
    authState.lastError = { title: 'Session expirée', message: 'Reconnectez-vous', duration: 5000 }
    render(<SigninFormModern />)
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Session expirée' }))
    expect(clearErrorMock).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Continuer avec Google/i }))
    await waitFor(() => expect(googleMock).toHaveBeenCalled())
    expect(trackMock).toHaveBeenCalledWith('google-click', { entry_point: 'signin_form' })
  })

  it('rend les deux états de chargement', () => {
    authState.isLoading = true; authState.isCredentialsLoading = true; authState.isGoogleLoading = true
    render(<SigninFormModern />)
    expect(screen.getByRole('button', { name: 'Connexion en cours...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Continuer avec Google/i })).toBeDisabled()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
