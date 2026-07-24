import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { CompleteProfileFormModern } from '@/features/auth/ui/v1/CompleteProfileFormModern'

const pushMock = jest.fn()
const replaceMock = jest.fn()
const toastMock = jest.fn()
const completeProfileMock = jest.fn()
const clearErrorMock = jest.fn()
const updateSessionMock = jest.fn()
const signOutMock = jest.fn()

let mockSession: Record<string, any> | null
let mockStatus: 'loading' | 'authenticated' | 'unauthenticated'
let mockLastError: Record<string, any> | null
let mockIsLoading: boolean

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, status: mockStatus, update: updateSessionMock }),
  signOut: (...args: unknown[]) => signOutMock(...args),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants: _variants, initial: _initial, animate: _animate, transition: _transition, whileHover: _whileHover, custom: _custom, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}))

jest.mock('@/components/logo/Logo', () => ({
  __esModule: true,
  default: () => <span>Logo Nkama</span>,
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock('@/features/auth/hooks', () => ({
  useCompleteProfile: () => ({
    completeProfile: completeProfileMock,
    isLoading: mockIsLoading,
    lastError: mockLastError,
    clearError: clearErrorMock,
  }),
  mapCompleteProfileError: () => ({ title: 'Session invalide', message: 'Utilisateur introuvable', duration: 7000 }),
}))

jest.mock('@/lib/auth/role-routing', () => ({
  getPostAuthRedirectPath: (user: { roles?: string[] }) => user.roles?.includes('Announcer') ? '/property' : '/',
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('react-hook-form', () => {
  const ReactModule = require('react') as typeof React
  const getValue = (values: any, path: string) => path.split('.').reduce((current, key) => current?.[key], values)
  const setValueAtPath = (values: any, path: string, value: unknown) => {
    const clone = JSON.parse(JSON.stringify(values))
    const keys = path.split('.')
    let current = clone
    keys.slice(0, -1).forEach((key) => {
      current[key] ??= {}
      current = current[key]
    })
    current[keys.at(-1)!] = value
    return clone
  }
  return {
    useForm: ({ defaultValues }: { defaultValues: any }) => {
      const [values, setValues] = ReactModule.useState(defaultValues)
      const control = { values, setValue: (name: string, value: unknown) => setValues((old: any) => setValueAtPath(old, name, value)) }
      return {
        control,
        watch: (name: string) => getValue(values, name),
        reset: (next: any) => setValues(next),
        setValue: control.setValue,
        formState: { isSubmitting: false, errors: {} },
        handleSubmit: (callback: (data: any) => unknown) => (event: React.FormEvent) => {
          event.preventDefault()
          return callback(values)
        },
      }
    },
  }
})

function Field({ control, name, label, type = 'text', disabled }: any) {
  return (
    <label>
      {label}
      <input
        aria-label={label}
        type={type}
        disabled={disabled}
        value={name.split('.').reduce((current: any, key: string) => current?.[key], control.values) ?? ''}
        onChange={(event) => control.setValue(name, event.target.value)}
      />
    </label>
  )
}

jest.mock('@/components/shared/form/InputFormApp', () => ({ InputFormApp: (props: any) => <Field {...props} /> }))
jest.mock('@/components/shared/form/PhoneNumberFormAppSimple', () => ({ PhoneNumberFormAppSimple: (props: any) => <Field {...props} /> }))
jest.mock('@/components/shared/form/DateSelect', () => ({
  DateSelect: ({ control, name, label }: any) => (
    <fieldset>
      <legend>{label}</legend>
      {['day', 'month', 'year'].map((part) => <Field key={part} control={control} name={`${name}.${part}`} label={`${label} ${part}`} />)}
    </fieldset>
  ),
}))
jest.mock('@/components/shared/form/CheckboxFormApp', () => ({
  CheckboxFormApp: ({ control, name, label }: any) => (
    <label>
      <input
        type="checkbox"
        aria-label={name}
        checked={Boolean(name.split('.').reduce((current: any, key: string) => current?.[key], control.values))}
        onChange={(event) => control.setValue(name, event.target.checked)}
      />
      {label}
    </label>
  ),
}))
jest.mock('@/components/shared/ui/ButtonApp', () => ({
  ButtonApp: ({ title, isLoading: _isLoading, ...props }: any) => <button {...props}>{title}</button>,
}))

function sessionUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'complete-profile-9c',
    email: 'glenn@example.com',
    firstname: 'Glenn',
    lastname: 'Eriss',
    phoneNumbers: ['+24166545430'],
    birthDate: '1995-06-15',
    roles: ['User'],
    metadata: { needsProfileCompletion: true },
    ...overrides,
  }
}

describe('CompleteProfileFormModern', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStatus = 'authenticated'
    mockSession = { user: sessionUser() }
    mockLastError = null
    mockIsLoading = false
    completeProfileMock.mockResolvedValue({ success: true, user: sessionUser({ roles: ['User', 'Announcer'], metadata: {} }) })
    updateSessionMock.mockResolvedValue(undefined)
  })

  it('affiche le chargement puis redirige une session absente', () => {
    mockStatus = 'loading'
    const { rerender } = render(<CompleteProfileFormModern />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()

    mockStatus = 'unauthenticated'
    mockSession = null
    rerender(<CompleteProfileFormModern />)
    expect(replaceMock).toHaveBeenCalledWith('/signin')
  })

  it('redirige immédiatement un profil déjà complet', async () => {
    mockSession = { user: sessionUser({ metadata: {} }) }
    render(<CompleteProfileFormModern />)
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
  })

  it('hydrate le formulaire, choisit annonceur et finalise le compte', async () => {
    render(<CompleteProfileFormModern />)
    expect(await screen.findByRole('heading', { name: 'Compléter le profil' })).toBeVisible()
    expect(screen.getByText('glenn@example.com')).toBeVisible()
    expect(screen.getByLabelText('Prénom')).toHaveValue('Glenn')
    expect(screen.getByLabelText('Date de naissance day')).toHaveValue('15')

    fireEvent.click(screen.getByRole('button', { name: /Annonceur/i }))
    fireEvent.click(screen.getByLabelText('acceptAnnouncerTerms'))
    fireEvent.click(screen.getByLabelText('termsOfPrivacyPolicy'))
    fireEvent.submit(screen.getByRole('button', { name: 'Finaliser mon compte' }).closest('form')!)

    await waitFor(() => expect(completeProfileMock).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'complete-profile-9c',
      accountType: 'Announcer',
      acceptTerms: true,
      acceptAnnouncerTerms: true,
      birthdate: { day: '15', month: '06', year: '1995' },
    })))
    expect(updateSessionMock).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ roles: ['User', 'Announcer'] }) }))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profil finalisé', variant: 'success' }))
    expect(pushMock).toHaveBeenCalledWith('/property')
  })

  it('tolère l échec de mise à jour de session et ne redirige pas sur échec métier', async () => {
    updateSessionMock.mockRejectedValueOnce(new Error('NextAuth offline'))
    render(<CompleteProfileFormModern />)
    await screen.findByRole('heading', { name: 'Compléter le profil' })
    fireEvent.click(screen.getByLabelText('termsOfPrivacyPolicy'))
    fireEvent.submit(screen.getByRole('button', { name: 'Finaliser mon compte' }).closest('form')!)
    await waitFor(() => expect(pushMock).toHaveBeenCalled())

    jest.clearAllMocks()
    completeProfileMock.mockResolvedValueOnce({ success: false })
    render(<CompleteProfileFormModern />)
    await screen.findAllByRole('heading', { name: 'Compléter le profil' })
    const forms = screen.getAllByRole('button', { name: 'Finaliser mon compte' })
    fireEvent.submit(forms.at(-1)!.closest('form')!)
    await waitFor(() => expect(completeProfileMock).toHaveBeenCalled())
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('affiche l erreur du hook et permet la déconnexion', async () => {
    mockLastError = { title: 'Profil invalide', message: 'Téléphone déjà utilisé', duration: 6000 }
    render(<CompleteProfileFormModern />)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profil invalide' })))
    expect(clearErrorMock).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/signin' })
  })
})
