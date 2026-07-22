import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProfileInformationFormModern } from '@/features/users/profile-management/ui/v1/ProfileInformationFormModern'

const toastMock = jest.fn()
const updateProfileMock = jest.fn()
const clearErrorMock = jest.fn()

let mockUser: Record<string, any> | null
let mockLastError: Record<string, any> | null
let mockIsLoading: boolean

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ user: mockUser }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

jest.mock('@/features/users/profile-management/hooks', () => ({
  useProfileInformationUpdate: () => ({
    updateProfileInformation: updateProfileMock,
    isLoading: mockIsLoading,
    lastError: mockLastError,
    clearError: clearErrorMock,
  }),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

jest.mock('@/lib/generateColorFromName', () => ({
  generateColorFromName: () => '#146B67',
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: ({ alt }: { alt: string }) => <span>{alt}</span>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
      const valuesRef = ReactModule.useRef(values)
      valuesRef.current = values
      const formRef = ReactModule.useRef<any>()
      if (!formRef.current) {
        const control = {
          values,
          setValue: (name: string, value: unknown) => setValues((old: any) => setValueAtPath(old, name, value)),
        }
        formRef.current = {
          control,
          watch: (name: string) => getValue(valuesRef.current, name),
          reset: (next: any) => setValues(next),
          formState: { isSubmitting: false, errors: {} },
          handleSubmit: (callback: (data: any) => unknown) => (event: React.FormEvent) => {
            event.preventDefault()
            return callback(valuesRef.current)
          },
        }
      }
      formRef.current.control.values = values
      return formRef.current
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

jest.mock('@/components/shared/form/InputFormApp', () => ({
  InputFormApp: (props: any) => <Field {...props} />,
}))

jest.mock('@/components/shared/form/PhoneNumberFormAppSimple', () => ({
  PhoneNumberFormAppSimple: (props: any) => <Field {...props} />,
}))

jest.mock('@/components/shared/form/SelectFormApp', () => ({
  SelectFormApp: (props: any) => <Field {...props} />,
}))

jest.mock('@/components/shared/ui/ButtonApp', () => ({
  ButtonApp: ({ title, isLoading: _isLoading, ...props }: any) => <button {...props}>{title}</button>,
}))

function user(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'profile-9c',
    firstname: 'Glenn',
    lastname: 'Eriss',
    email: 'glenn@example.com',
    birthDate: '1995-06-15',
    phoneNumbers: ['+24166545430'],
    phoneNumberVerified: true,
    country: { code: 'GA' },
    roles: ['User', 'Announcer'],
    createdAt: { seconds: 1_700_000_000, nanoseconds: 0 },
    updatedAt: { seconds: 1_710_000_000, nanoseconds: 0 },
    metadata: {
      socialProfiles: {
        facebook: { url: 'https://facebook.com/nkama', handle: '@nkama' },
        instagram: { url: 42, handle: null },
      },
    },
    ...overrides,
  }
}

describe('ProfileInformationFormModern', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUser = user()
    mockLastError = null
    mockIsLoading = false
    updateProfileMock.mockResolvedValue({ success: true })
  })

  it('affiche un chargement sans utilisateur puis hydrate le profil', async () => {
    mockUser = null
    const { rerender } = render(<ProfileInformationFormModern />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()

    mockUser = user()
    rerender(<ProfileInformationFormModern />)
    expect(await screen.findByLabelText('Prénom')).toHaveValue('Glenn')
    expect(screen.getByLabelText('Adresse email')).toHaveValue('glenn@example.com')
    expect(screen.getByText('Vérifié')).toBeVisible()
    expect(screen.getByText('Membre depuis')).toBeVisible()
  })

  it('ouvre et hydrate les réseaux sociaux pour un annonceur', async () => {
    render(<ProfileInformationFormModern />)
    const toggle = await screen.findByRole('button', { name: /Réseaux sociaux/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Facebook - lien')).toHaveValue('https://facebook.com/nkama')
    expect(screen.getByLabelText('Facebook - @')).toHaveValue('@nkama')
    expect(screen.getByLabelText('Instagram - lien')).toHaveValue('')
    fireEvent.click(toggle)
    expect(screen.queryByLabelText('Facebook - lien')).not.toBeInTheDocument()
  })

  it('enregistre les informations et avertit quand un téléphone vérifié change', async () => {
    render(<ProfileInformationFormModern />)
    const phone = await screen.findByLabelText('Numéro de téléphone')
    fireEvent.change(phone, { target: { value: '+24174112233' } })
    expect(screen.getByText(/vous perdrez le statut/)).toBeVisible()
    fireEvent.submit(screen.getByRole('button', { name: 'Enregistrer les modifications' }).closest('form')!)

    await waitFor(() => expect(updateProfileMock).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'profile-9c',
      phoneNumber: '+24174112233',
      countryCode: 'GA',
      socialProfiles: expect.objectContaining({ facebook: expect.any(Object) }),
    })))
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Informations mises à jour',
      variant: 'warning',
    }))
  })

  it('bloque la modification du téléphone vérifié pendant la période de sécurité', async () => {
    const lockUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    mockUser = user({
      metadata: { phoneVerification: { lockUntil: { seconds: Math.floor(lockUntil.getTime() / 1000) } } },
    })
    render(<ProfileInformationFormModern />)
    const phone = await screen.findByLabelText('Numéro de téléphone')
    expect(phone).toBeDisabled()
    expect(screen.getByText('Numéro verrouillé temporairement')).toBeVisible()
    expect(screen.getByText(/dans 3 jours/)).toBeVisible()
  })

  it('ne redirige pas le succès métier et affiche les erreurs du hook', async () => {
    mockLastError = { title: 'Profil invalide', message: 'Téléphone utilisé', duration: 6000 }
    updateProfileMock.mockResolvedValueOnce({ success: false })
    render(<ProfileInformationFormModern />)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profil invalide' })))
    expect(clearErrorMock).toHaveBeenCalled()

    fireEvent.submit(screen.getByRole('button', { name: 'Enregistrer les modifications' }).closest('form')!)
    await waitFor(() => expect(updateProfileMock).toHaveBeenCalled())
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Informations mises à jour' }))
  })

  it('refuse une sauvegarde dont la session ne contient pas de uid', async () => {
    mockUser = user({ uid: '' })
    render(<ProfileInformationFormModern />)
    fireEvent.submit((await screen.findByRole('button', { name: 'Enregistrer les modifications' })).closest('form')!)
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Session invalide' })))
    expect(updateProfileMock).not.toHaveBeenCalled()
  })
})
