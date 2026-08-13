import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { PublishAuthModal } from '@/components/property-publish/PublishAuthModal'

const signupMock = jest.fn()
const credentialsMock = jest.fn()
const googleMock = jest.fn()
const becomeAnnouncerMock = jest.fn()
const toastMock = jest.fn()
const trackMock = jest.fn()
const getSessionMock = jest.fn()
let mockUser: any = null
let mockIsAnnouncer = false
let mockBusy = false

jest.mock('next/navigation', () => ({ usePathname: () => '/property/add/home' }))
jest.mock('next-auth/react', () => ({ getSession: () => getSessionMock() }))
jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: mockUser }) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/lib/auth/role-routing', () => ({ isAnnouncer: () => mockIsAnnouncer }))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: new Proxy({}, { get: (_target, key) => String(key) }),
  useTrackEvent: () => ({ trackEvent: trackMock }),
}))
jest.mock('@/features/auth/hooks', () => ({
  useSignup: () => ({ signup: signupMock, isLoading: mockBusy }),
  useSignin: () => ({
    signinWithCredentials: credentialsMock,
    signinWithGoogle: googleMock,
    isCredentialsLoading: mockBusy,
    isGoogleLoading: mockBusy,
  }),
}))
jest.mock('@/features/users/become-announcer/hooks', () => ({
  useBecomeAnnouncer: () => ({ becomeAnnouncer: becomeAnnouncerMock, isLoading: mockBusy }),
}))
jest.mock('@/features/auth/ui/v1/signup.mapper', () => ({
  mapRegisterFormToSignupData: (values: any, overrides: any) => ({ ...values, ...overrides }),
  mapSignupErrorToToast: () => ({ title: 'Inscription refusée', description: 'Email déjà utilisé' }),
}))

jest.mock('@trouve-ton-nkama/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: any) => open ? <div><button onClick={() => onOpenChange(false)}>fermer-dialogue</button>{children}</div> : null,
  DialogContent: ({ children }: any) => <section>{children}</section>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))

jest.mock('react-hook-form', () => {
  const ReactModule = require('react') as typeof React
  return {
    useForm: ({ defaultValues }: any) => {
      const [values, setValues] = ReactModule.useState(defaultValues)
      const control = { values, setValue: (name: string, value: unknown) => setValues((current: any) => ({ ...current, [name]: value })) }
      return {
        control,
        handleSubmit: (callback: any) => (event: React.FormEvent) => {
          event.preventDefault()
          return callback(values)
        },
      }
    },
  }
})

function Field({ control, name, label, type = 'text' }: any) {
  return <label>{label}<input aria-label={label} type={type} value={control.values[name] ?? ''} onChange={(event) => control.setValue(name, event.target.value)} /></label>
}

jest.mock('@/components/shared/form/InputFormApp', () => ({ InputFormApp: (props: any) => <Field {...props} /> }))
jest.mock('@/components/shared/form/PhoneNumberFormAppSimple', () => ({ PhoneNumberFormAppSimple: (props: any) => <Field {...props} /> }))
jest.mock('@/components/shared/form/DateSelect', () => ({ DateSelect: () => <div>Date de naissance</div> }))
jest.mock('@/components/shared/form/CheckboxFormApp', () => ({
  CheckboxFormApp: ({ control, name, label }: any) => <label><input aria-label={name} type="checkbox" checked={Boolean(control.values[name])} onChange={(event) => control.setValue(name, event.target.checked)} />{label}</label>,
}))

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  prepareForExternalRedirect: jest.fn(),
  description: 'Votre annonce est prête.',
  becomeAnnouncerSource: 'property-form',
}

describe('PublishAuthModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUser = null
    mockIsAnnouncer = false
    mockBusy = false
    signupMock.mockResolvedValue({ success: true, userId: 'user-1' })
    credentialsMock.mockResolvedValue({ success: true })
    becomeAnnouncerMock.mockResolvedValue({ success: true })
    googleMock.mockResolvedValue(undefined)
    getSessionMock.mockResolvedValue({ user: { roles: ['User'] } })
  })

  it('propose les deux parcours et autorise la fermeture au repos', () => {
    render(<PublishAuthModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Encore une étape avant de publier' })).toBeVisible()
    expect(screen.getByText('Votre annonce est prête.')).toBeVisible()
    expect(trackMock).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'fermer-dialogue' }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('crée un compte puis reprend la connexion après vérification', async () => {
    render(<PublishAuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Créer un compte' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'glenn@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret123' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Créer mon compte annonceur' }).closest('form')!)
    expect(await screen.findByRole('heading', { name: 'Vérifiez votre email' })).toBeVisible()
    expect(screen.getByText('glenn@example.com')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: "J'ai vérifié, se connecter" }))
    await waitFor(() => expect(credentialsMock).toHaveBeenCalledWith({ email: 'glenn@example.com', password: 'secret123' }))
    expect(await screen.findByRole('heading', { name: 'Activer le mode annonceur' })).toBeVisible()
  })

  it('affiche l’échec d’inscription', async () => {
    signupMock.mockResolvedValueOnce({ success: false, error: { code: 'email-in-use' } })
    render(<PublishAuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Créer un compte' }))
    fireEvent.submit(screen.getByRole('button', { name: 'Créer mon compte annonceur' }).closest('form')!)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Inscription refusée', variant: 'destructive' })))
  })

  it('connecte un annonceur et passe à la finalisation', async () => {
    mockIsAnnouncer = true
    render(<PublishAuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: "J'ai déjà un compte" }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'annonceur@example.com' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }).closest('form')!)
    expect(await screen.findByRole('heading', { name: 'Publication en cours' })).toBeVisible()
    expect(trackMock).toHaveBeenCalled()
  })

  it('explique un échec de connexion', async () => {
    credentialsMock.mockResolvedValueOnce({ success: false, error: { title: 'Compte bloqué', message: 'Réessayez demain', duration: 9000 } })
    render(<PublishAuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: "J'ai déjà un compte" }))
    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }).closest('form')!)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Compte bloqué', duration: 9000 })))
  })

  it('sauvegarde le brouillon avant la connexion Google', async () => {
    render(<PublishAuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: "J'ai déjà un compte" }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuer avec Google' }))
    expect(defaultProps.prepareForExternalRedirect).toHaveBeenCalled()
    expect(googleMock).toHaveBeenCalledWith({ callbackUrl: '/property/add/home' })
  })

  it('active le rôle annonceur d’un utilisateur déjà connecté', async () => {
    mockUser = { uid: 'user-2' }
    render(<PublishAuthModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Activer le mode annonceur' })).toBeVisible()
    fireEvent.click(screen.getByLabelText('acceptAnnouncerTerms'))
    fireEvent.submit(screen.getByRole('button', { name: 'Activer et publier' }).closest('form')!)
    await waitFor(() => expect(becomeAnnouncerMock).toHaveBeenCalledWith({ acceptAnnouncerTerms: true, source: 'property-form' }))
    expect(await screen.findByRole('heading', { name: 'Publication en cours' })).toBeVisible()
  })

  it('affiche l’échec d’activation et bloque la fermeture pendant une opération', async () => {
    mockUser = { uid: 'user-3' }
    becomeAnnouncerMock.mockResolvedValueOnce({ success: false, error: {} })
    const { rerender } = render(<PublishAuthModal {...defaultProps} />)
    fireEvent.submit(screen.getByRole('button', { name: 'Activer et publier' }).closest('form')!)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Activation impossible' })))

    mockBusy = true
    rerender(<PublishAuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'fermer-dialogue' }))
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })
})
