import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SignupMobileComponent } from '@/components/signup/SignupMobileComponent'

const mockSignup = jest.fn()
const mockToast = jest.fn()
const mockPush = jest.fn()
const mockSignIn = jest.fn()
let mockLoading = false

jest.mock('next/font/google', () => ({ Inter: () => ({ className: 'inter' }) }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a> }))
jest.mock('next-auth/react', () => ({ signIn: (...args: any[]) => mockSignIn(...args) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))
jest.mock('@/features/auth/hooks', () => ({ useSignup: () => ({ signup: mockSignup, isLoading: mockLoading }) }))
jest.mock('@/features/auth/ui/v1/signup.mapper', () => ({ mapRegisterFormToSignupData: (values: any) => ({ ...values, mapped: true }) }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))

jest.mock('react-hook-form', () => {
  const ReactModule = require('react') as typeof React
  return { useForm: ({ defaultValues }: any) => {
    const [values, setValues] = ReactModule.useState(defaultValues)
    const control = { values, setValue: (name: string, value: any) => setValues((old: any) => ({ ...old, [name]: value })) }
    return { control, watch: (name: string) => values[name], setValue: control.setValue, formState: { isSubmitting: false }, handleSubmit: (callback: any) => (event: React.FormEvent) => { event.preventDefault(); return callback(values) } }
  } }
})

const Field = ({ control, name, label, type = 'text' }: any) => <label>{label}<input aria-label={label || name} type={type} value={control.values[name] ?? ''} onChange={(event) => control.setValue(name, event.target.value)} /></label>
jest.mock('@/components/shared/form/InputFormApp', () => ({ InputFormApp: (props: any) => <Field {...props} /> }))
jest.mock('@/components/shared/form/PhoneNumberFormApp', () => ({ PhoneNumberFormApp: (props: any) => <Field {...props} label="Téléphone" /> }))
jest.mock('@/components/shared/form/DateSelect', () => ({ DateSelect: () => <div>Date de naissance</div> }))
jest.mock('@/components/shared/form/CheckboxFormApp', () => ({ CheckboxFormApp: ({ control, name, label }: any) => <label><input aria-label={name} type="checkbox" checked={Boolean(control.values[name])} onChange={(event) => control.setValue(name, event.target.checked)} />{label}</label> }))
jest.mock('@/components/shared/ui/ButtonApp', () => ({ ButtonApp: ({ title, isLoading: _loading, ...props }: any) => <button {...props}>{title}</button> }))

describe('SignupMobileComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoading = false
    mockSignup.mockResolvedValue({ success: true, userId: 'new-user' })
    mockSignIn.mockResolvedValue(undefined)
  })

  it('crée un utilisateur et redirige vers la confirmation', async () => {
    render(<SignupMobileComponent />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'glenn@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Créer un compte' }).closest('form')!)
    await waitFor(() => expect(mockSignup).toHaveBeenCalledWith(expect.objectContaining({ email: 'glenn@example.com', accountType: 'User', mapped: true })))
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
    expect(mockPush).toHaveBeenCalledWith('/signup/success?uid=new-user')
  })

  it('sélectionne le compte annonceur et révèle ses conditions', async () => {
    render(<SignupMobileComponent />)
    fireEvent.click(screen.getByRole('button', { name: /Annonceur/ }))
    expect(screen.getByRole('button', { name: /Annonceur/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('acceptAnnouncerTerms')).toBeVisible()
    fireEvent.submit(screen.getByRole('button', { name: 'Créer un compte' }).closest('form')!)
    await waitFor(() => expect(mockSignup).toHaveBeenCalledWith(expect.objectContaining({ accountType: 'Announcer' })))
  })

  it.each([
    ['EMAIL_ALREADY_IN_USE', 'Email déjà utilisé'],
    ['INVALID_EMAIL', 'Email invalide'],
    ['WEAK_PASSWORD', 'Mot de passe faible'],
    ['PHONE_ALREADY_IN_USE', 'Numéro déjà utilisé'],
    ['TERMS_NOT_ACCEPTED', 'Conditions non acceptées'],
    ['ANNOUNCER_TERMS_NOT_ACCEPTED', 'Conditions annonceur non acceptées'],
    ['OTHER', 'Création de compte'],
  ])('traduit l’erreur %s', async (code, title) => {
    mockSignup.mockResolvedValueOnce({ success: false, error: { code, message: 'message brut' } })
    render(<SignupMobileComponent />)
    fireEvent.submit(screen.getByRole('button', { name: 'Créer un compte' }).closest('form')!)
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title, variant: 'destructive' })))
  })

  it('traduit une exception inattendue', async () => {
    mockSignup.mockRejectedValueOnce(new Error('down'))
    render(<SignupMobileComponent />)
    fireEvent.submit(screen.getByRole('button', { name: 'Créer un compte' }).closest('form')!)
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erreur' })))
  })

  it('lance Google et reflète les états de chargement', async () => {
    const { rerender } = render(<SignupMobileComponent />)
    fireEvent.click(screen.getByRole('button', { name: /Continuer avec Google/ }))
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('google'))
    mockLoading = true
    rerender(<SignupMobileComponent />)
    expect(screen.getByRole('button', { name: 'Création en cours...' })).toBeDisabled()
  })
})
