import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import PasswordReset from '@/components/password-reset/PasswordReset'

const pushMock = jest.fn()
const replaceMock = jest.fn()
const toastMock = jest.fn()
const confirmResetMock = jest.fn()
const clearErrorMock = jest.fn()
let mockCode: string | null = 'reset-code'
let mockLoading = false
let mockSuccess = false
let mockLastError: any = null
let mockRedirectFailure = false

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: () => mockCode }),
}))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a> }))
jest.mock('@trouve-ton-nkama/ui/logo', () => ({ __esModule: true, default: () => <span>Logo Nkama</span> }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ warn: jest.fn(), info: jest.fn() }) }))
jest.mock('@/features/auth/hooks', () => ({
  usePasswordReset: () => ({
    confirmReset: confirmResetMock,
    clearError: clearErrorMock,
    isLoading: mockLoading,
    isSuccess: mockSuccess,
    lastError: mockLastError,
    shouldRedirectToFailure: mockRedirectFailure,
  }),
}))
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_target, tag: string) => ({ children, initial: _i, animate: _a, transition: _t, variants: _v, custom: _c, whileHover: _w, ...props }: any) => React.createElement(tag, props, children) }),
}))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))

jest.mock('react-hook-form', () => {
  const ReactModule = require('react') as typeof React
  return {
    useForm: ({ defaultValues }: any) => {
      const [values, setValues] = ReactModule.useState(defaultValues)
      const control = { values, setValue: (name: string, value: string) => setValues((current: any) => ({ ...current, [name]: value })) }
      return {
        control,
        watch: (name: string) => values[name],
        handleSubmit: (callback: any) => (event: React.FormEvent) => { event.preventDefault(); return callback(values) },
      }
    },
  }
})

jest.mock('@/components/shared/form/InputFormApp', () => ({
  InputFormApp: ({ control, name, label, type }: any) => <label>{label}<input aria-label={label} type={type} value={control.values[name]} onChange={(event) => control.setValue(name, event.target.value)} /></label>,
}))
jest.mock('@/components/shared/ui/ButtonApp', () => ({
  ButtonApp: ({ title, isLoading: _loading, ...props }: any) => <button {...props}>{title}</button>,
}))

describe('PasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCode = 'reset-code'
    mockLoading = false
    mockSuccess = false
    mockLastError = null
    mockRedirectFailure = false
    confirmResetMock.mockResolvedValue(true)
  })

  it('redirige immédiatement un lien sans code', () => {
    mockCode = null
    render(<PasswordReset />)
    expect(replaceMock).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Modifier mon mot de passe' })).toBeDisabled()
  })

  it.each([
    ['abc', 'Faible'],
    ['Abcdefgh', 'Moyen'],
    ['Abcdefg1!', 'Fort'],
  ])('qualifie la robustesse de %s comme %s', (password, level) => {
    render(<PasswordReset />)
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: password } })
    expect(screen.getByText(level)).toBeVisible()
  })

  it('confirme le changement et affiche un retour positif', async () => {
    render(<PasswordReset />)
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'Secret123!' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'Secret123!' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Modifier mon mot de passe' }).closest('form')!)
    await waitFor(() => expect(confirmResetMock).toHaveBeenCalledWith('reset-code', 'Secret123!'))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mot de passe modifié', variant: 'success' }))
  })

  it('n’annonce aucun succès lorsque le service échoue', async () => {
    confirmResetMock.mockResolvedValueOnce(false)
    render(<PasswordReset />)
    fireEvent.submit(screen.getByRole('button', { name: 'Modifier mon mot de passe' }).closest('form')!)
    await waitFor(() => expect(confirmResetMock).toHaveBeenCalled())
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('affiche une erreur récupérable puis la nettoie', async () => {
    mockLastError = { code: 'weak-password', title: 'Mot de passe faible', message: 'Renforcez-le', duration: 6000 }
    render(<PasswordReset />)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mot de passe faible' })))
    expect(clearErrorMock).toHaveBeenCalled()
  })

  it('redirige une erreur de lien invalide vers l’écran d’échec', () => {
    mockLastError = { code: 'expired-action-code', title: 'Lien expiré', message: 'Expiré', duration: 5000 }
    mockRedirectFailure = true
    render(<PasswordReset />)
    expect(replaceMock).toHaveBeenCalled()
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('rend l’état de succès et ses deux sorties', () => {
    mockSuccess = true
    render(<PasswordReset />)
    expect(screen.getByRole('heading', { name: 'Mot de passe modifié' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Aller à la connexion' }))
    expect(pushMock).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /Retour à l'accueil/ })).toHaveAttribute('href')
  })

  it('permet de demander un nouveau lien et reflète le chargement', () => {
    mockLoading = true
    render(<PasswordReset />)
    expect(screen.getByRole('button', { name: 'Mise à jour en cours...' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Demander un nouveau lien' }))
    expect(pushMock).toHaveBeenCalled()
  })
})
