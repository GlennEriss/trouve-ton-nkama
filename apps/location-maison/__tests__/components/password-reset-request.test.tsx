import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import PasswordResetRequest from '@/components/password-reset/PasswordResetRequest'

const pushMock = jest.fn()
const toastMock = jest.fn()
const requestMock = jest.fn()
const resetStateMock = jest.fn()

let hookState: Record<string, any>

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/features/auth/hooks', () => ({ usePasswordResetRequest: () => hookState }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }))
jest.mock('@/components/logo/Logo', () => ({ __esModule: true, default: () => <span>Logo</span> }))
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_target, tag) => ({ children, ...props }: any) => React.createElement(tag as string, Object.fromEntries(Object.entries(props).filter(([key]) => !['animate', 'transition', 'initial', 'variants', 'custom', 'whileHover'].includes(key))), children) }) }))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))
jest.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }))
jest.mock('@/components/shared/ui/ButtonApp', () => ({ ButtonApp: ({ title, isLoading: _loading, ...props }: any) => <button {...props}>{title}</button> }))
jest.mock('@/components/shared/form/InputFormApp', () => ({ InputFormApp: ({ control, name, label, type }: any) => <label>{label}<input aria-label={label} type={type} value={control.values[name]} onChange={(event) => control.setValue(name, event.target.value)} /></label> }))
jest.mock('react-hook-form', () => {
  const R = require('react') as typeof React
  return { useForm: ({ defaultValues }: any) => {
    const [values, setValues] = R.useState(defaultValues)
    const control = { values, setValue: (name: string, value: string) => setValues((old: any) => ({ ...old, [name]: value })) }
    return { control, reset: () => setValues(defaultValues), handleSubmit: (callback: any) => (event: React.FormEvent) => { event.preventDefault(); return callback(values) } }
  } }
})

describe('PasswordResetRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hookState = { requestReset: requestMock, resetState: resetStateMock, isLoading: false, isSuccess: false, submittedEmail: '', isRateLimited: false, countdown: 0, lastError: null }
    requestMock.mockResolvedValue(true)
  })

  it('envoie une demande valide et confirme l adresse', async () => {
    render(<PasswordResetRequest />)
    fireEvent.change(screen.getByLabelText('Adresse email'), { target: { value: 'glenn@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Envoyer le lien de réinitialisation' }).closest('form')!)
    await waitFor(() => expect(requestMock).toHaveBeenCalledWith('glenn@example.com'))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Email envoyé', variant: 'success' }))
  })

  it('ne confirme pas une demande refusée et affiche l erreur du hook', async () => {
    requestMock.mockResolvedValue(false)
    hookState.lastError = { title: 'Trop de demandes', message: 'Patientez', duration: 6000 }
    render(<PasswordResetRequest />)
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Trop de demandes', variant: 'destructive' }))
    fireEvent.change(screen.getByLabelText('Adresse email'), { target: { value: 'glenn@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Envoyer le lien de réinitialisation' }).closest('form')!)
    await waitFor(() => expect(requestMock).toHaveBeenCalled())
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })

  it('bloque le formulaire pendant la limitation et formate le décompte', () => {
    hookState.isRateLimited = true; hookState.countdown = 125
    render(<PasswordResetRequest />)
    expect(screen.getByText('Veuillez patienter encore 2:05 avant de réessayer.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Attendre 2:05' })).toBeDisabled()
  })

  it('affiche le succès, permet le renvoi et le retour à la connexion', () => {
    hookState.isSuccess = true; hookState.submittedEmail = 'glenn@example.com'
    render(<PasswordResetRequest />)
    expect(screen.getByText('Un lien de réinitialisation a été envoyé à glenn@example.com.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }))
    expect(pushMock).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer un email' }))
    expect(resetStateMock).toHaveBeenCalled()
  })

  it('gère le succès sans email et le chargement', () => {
    hookState.isSuccess = true; hookState.submittedEmail = ''
    const { rerender } = render(<PasswordResetRequest />)
    expect(screen.getByText('Un lien de réinitialisation a été envoyé.')).toBeVisible()
    hookState.isSuccess = false; hookState.isLoading = true
    rerender(<PasswordResetRequest />)
    expect(screen.getByRole('button', { name: 'Envoyer le lien de réinitialisation' })).toBeDisabled()
  })
})
