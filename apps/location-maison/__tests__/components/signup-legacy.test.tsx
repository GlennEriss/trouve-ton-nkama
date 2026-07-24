import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Signup } from '@/components/signup/Signup'

const pushMock = jest.fn()
const toastMock = jest.fn()
const findUserMock = jest.fn()
const createUserDocumentMock = jest.fn()
const createAuthUserMock = jest.fn()
const signOutMock = jest.fn()
const transformMock = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/db/user.db', () => ({
  findUserByPhoneNumber: (...args: any[]) => findUserMock(...args),
  createUser: (...args: any[]) => createUserDocumentMock(...args),
}))
jest.mock('@/lib/transformToPerson', () => ({
  transformToPerson: (...args: any[]) => transformMock(...args),
}))
jest.mock('@/firebase/auth', () => ({
  auth: { name: 'auth' },
  createUserWithEmailAndPassword: (...args: any[]) => createAuthUserMock(...args),
  signOut: (...args: any[]) => signOutMock(...args),
}))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))

jest.mock('react-hook-form', () => {
  const ReactModule = require('react') as typeof React
  return {
    useForm: ({ defaultValues }: any) => {
      const [values, setValues] = ReactModule.useState(defaultValues)
      const control = {
        values,
        setValue: (name: string, value: any) => setValues((current: any) => ({ ...current, [name]: value })),
      }
      return {
        control,
        formState: { isSubmitting: false },
        handleSubmit: (callback: any) => (event: React.FormEvent) => {
          event.preventDefault()
          return callback(values)
        },
      }
    },
  }
})

const Field = ({ form, name, label, type = 'text' }: any) => (
  <label>
    {label || name}
    <input
      aria-label={label || name}
      type={type}
      value={form.control.values[name] ?? ''}
      onChange={(event) => form.control.setValue(name, event.target.value)}
    />
  </label>
)

jest.mock('@/components/forms/InputForm', () => ({ InputForm: (props: any) => <Field {...props} /> }))
jest.mock('@/components/forms/PhoneNumberForm', () => ({
  PhoneNumberForm: (props: any) => <Field {...props} label="Téléphone" />,
}))
jest.mock('@/components/forms/DateSelectForm', () => ({ DateSelectForm: () => <div>Date de naissance</div> }))
jest.mock('@/components/forms/CheckboxForm', () => ({
  CheckboxForm: ({ form, name, labelElement }: any) => (
    <label>
      <input
        aria-label={name}
        type="checkbox"
        checked={Boolean(form.control.values[name])}
        onChange={(event) => form.control.setValue(name, event.target.checked)}
      />
      {labelElement}
    </label>
  ),
}))
jest.mock('@/components/buttons/ButtonLoading', () => ({
  ButtonLoading: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@/components/layouts/LayoutAuth', () => ({
  LayoutAuth: ({ children, setIsOtherMethodConnection, isFormLoading }: any) => (
    <div>
      <span data-testid="layout-loading">{String(isFormLoading)}</span>
      <button type="button" onClick={() => setIsOtherMethodConnection(true)}>Autre connexion</button>
      {children}
    </div>
  ),
}))

const validPerson = {
  login: 'glenn@example.com',
  password: 'Secret123!',
  firstname: 'Glenn',
  phoneNumbers: ['+24166123456'],
}

describe('Signup legacy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    transformMock.mockReturnValue(validPerson)
    findUserMock.mockResolvedValue(null)
    createAuthUserMock.mockResolvedValue({ user: { uid: 'firebase-user' } })
    createUserDocumentMock.mockResolvedValue(undefined)
    signOutMock.mockResolvedValue(undefined)
  })

  const submit = () => fireEvent.submit(screen.getByRole('button', { name: "S'enregistrer" }).closest('form')!)

  it('crée le compte complet, demande la vérification puis déconnecte Firebase', async () => {
    render(<Signup />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'glenn@example.com' } })
    submit()
    await waitFor(() => expect(createUserDocumentMock).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'firebase-user',
      providers: ['CREDENTIALS'],
      notificationParameter: expect.objectContaining({ isNew: true }),
    })))
    expect(findUserMock).toHaveBeenCalledWith('+24166123456')
    expect(createAuthUserMock).toHaveBeenCalledWith(expect.anything(), 'glenn@example.com', 'Secret123!')
    expect(fetch).toHaveBeenCalledWith('/api/auth/send-verification-email', expect.objectContaining({
      body: '{"email":"glenn@example.com"}',
    }))
    expect(signOutMock).toHaveBeenCalled()
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
    expect(pushMock).toHaveBeenCalledWith('/signup/success?uid=firebase-user')
  })

  it('bloque un téléphone absent ou déjà utilisé', async () => {
    transformMock.mockReturnValueOnce({ ...validPerson, phoneNumbers: [] })
    const { unmount } = render(<Signup />)
    submit()
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Numéro de téléphone manquant' })))
    unmount()

    jest.clearAllMocks()
    transformMock.mockReturnValue(validPerson)
    findUserMock.mockResolvedValueOnce({ uid: 'existing' })
    render(<Signup />)
    submit()
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Numéro déjà utilisé' })))
    expect(createAuthUserMock).not.toHaveBeenCalled()
  })

  it.each([
    ['auth/email-already-in-use', 'Email déjà utilisé'],
    ['auth/invalid-email', 'Email invalide'],
    ['auth/weak-password', 'Mot de passe faible'],
    ['auth/operation-not-allowed', 'Méthode non autorisée'],
    ['auth/too-many-requests', 'Trop de tentatives'],
  ])('traduit l’erreur Firebase %s', async (code, title) => {
    createAuthUserMock.mockRejectedValueOnce(Object.assign(new Error('firebase'), { code }))
    render(<Signup />)
    submit()
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title, variant: 'destructive' })))
  })

  it.each([
    ['Le numéro de téléphone est invalide', 'Numéro de téléphone invalide'],
    ['Panne inconnue', 'Création de compte'],
  ])('affiche une erreur métier %s', async (message, title) => {
    createAuthUserMock.mockRejectedValueOnce(new Error(message))
    render(<Signup />)
    submit()
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title, description: message })))
  })

  it('ne bloque pas le compte quand l’envoi du courriel échoue et reflète une connexion externe', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('mail offline'))
    render(<Signup />)
    fireEvent.click(screen.getByRole('button', { name: 'Autre connexion' }))
    expect(screen.getByTestId('layout-loading')).toHaveTextContent('true')
    expect(screen.getByRole('button', { name: "S'enregistrer" })).toBeDisabled()
  })
})
