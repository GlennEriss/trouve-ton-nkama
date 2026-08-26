/**
 * Soumission complète du formulaire d'inscription (2026-08-26), demandée explicitement :
 * vérifier le comportement réel de bout en bout — pas seulement l'état activé/désactivé du
 * bouton « Continuer » (déjà couvert par SignupFormModern.test.tsx) — dans les deux cas :
 * champs optionnels (nom de l'entreprise, WhatsApp) vides, et tous les champs remplis.
 * Logiquement les deux doivent aboutir à un compte créé.
 *
 * react-hook-form est mocké (même technique que complete-profile-form-modern.test.tsx et
 * signup-mobile.test.tsx) pour piloter le multi-étapes sans dépendre des Select Radix réels
 * (DateSelect), non exercés ailleurs dans ce projet en interaction réelle.
 */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockSignup = jest.fn()
const mockToast = jest.fn()
const mockPush = jest.fn()
const mockTrackEvent = jest.fn()

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))
jest.mock('../../../hooks', () => ({ useSignup: () => ({ signup: mockSignup, isLoading: false }) }))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_AUTH_SIGNUP_CLICK: 'cta_auth_signup_click', BUSINESS_AUTH_SIGNUP_SUCCESS: 'business_auth_signup_success' },
  useTrackEvent: () => ({ trackEvent: mockTrackEvent }),
}))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }) }))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
jest.mock('@trouve-ton-nkama/ui/logo', () => ({ __esModule: true, default: () => <span>Logo Nkama</span> }))
jest.mock('../PhoneAuthModal', () => ({ PhoneAuthModal: () => null }))
jest.mock('framer-motion', () => {
  const ReactModule = require('react');

  const FRAMER_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layoutId', 'custom',
  ]);

  const toElement = (tag: string) => ({ children, ...props }: any) => {
    const cleanProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props || {})) {
      if (!FRAMER_PROPS.has(key)) {
        cleanProps[key] = value;
      }
    }
    const safeTag = ['button', 'h1', 'h2', 'h3', 'p', 'span', 'div'].includes(tag) ? tag : 'div';
    return ReactModule.createElement(safeTag, cleanProps, children);
  };

  const motion = new Proxy({}, { get: (_, prop: string) => toElement(prop) });

  return {
    motion,
    AnimatePresence: ({ children }: any) => ReactModule.createElement(ReactModule.Fragment, null, children),
    useReducedMotion: () => false,
  };
})

function getValue(values: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], values)
}
function setValueAtPath(values: any, path: string, value: unknown) {
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

jest.mock('react-hook-form', () => {
  const ReactModule = require('react') as typeof React
  return {
    useForm: ({ defaultValues }: { defaultValues: any }) => {
      const [values, setValues] = ReactModule.useState(defaultValues)
      const control = { values, setValue: (name: string, value: unknown) => setValues((old: any) => setValueAtPath(old, name, value)) }
      return {
        control,
        watch: () => values,
        setValue: control.setValue,
        formState: { errors: {} },
        trigger: async () => true,
        handleSubmit: (callback: (data: any) => unknown) => (event: React.FormEvent) => {
          event.preventDefault()
          return callback(values)
        },
      }
    },
  }
})

function Field({ control, name, label, placeholder, type = 'text' }: any) {
  const ariaLabel = label || placeholder || name
  return (
    <label>
      {label}
      <input
        aria-label={ariaLabel}
        placeholder={placeholder}
        type={type}
        value={getValue(control.values, name) ?? ''}
        onChange={(event) => control.setValue(name, event.target.value)}
      />
    </label>
  )
}

jest.mock('@/components/shared/form/InputFormApp', () => ({ InputFormApp: (props: any) => <Field {...props} /> }))
jest.mock('@/components/shared/form/PhoneNumberFormAppSimple', () => ({ PhoneNumberFormAppSimple: (props: any) => <Field {...props} /> }))
jest.mock('@/components/shared/form/DateSelect', () => ({
  DateSelect: ({ control, name }: any) => (
    <fieldset>
      <legend>Date de naissance</legend>
      {['day', 'month', 'year'].map((part) => (
        <Field key={part} control={control} name={`${name}.${part}`} label={`Date de naissance ${part}`} />
      ))}
    </fieldset>
  ),
}))
jest.mock('@/components/shared/form/CheckboxFormApp', () => ({
  CheckboxFormApp: ({ control, name, label }: any) => (
    <label>
      <input
        type="checkbox"
        aria-label={name}
        checked={Boolean(getValue(control.values, name))}
        onChange={(event) => control.setValue(name, event.target.checked)}
      />
      {label}
    </label>
  ),
}))
jest.mock('@/components/shared/ui/ButtonApp', () => ({
  ButtonApp: ({ title, isLoading: _isLoading, ...props }: any) => <button {...props}>{title}</button>,
}))

import { SignupFormModern } from '../SignupFormModern'

// Mot de passe valide au sens de FormRegisterSchema : >=8, une majuscule, un chiffre.
const VALID_PASSWORD = 'Password1'

async function fillStep1(withCompanyName: boolean) {
  fireEvent.change(screen.getByPlaceholderText('Entrez votre nom'), { target: { value: 'Ondo' } })
  fireEvent.change(screen.getByPlaceholderText(/pr[ée]nom/i), { target: { value: 'Gerard' } })
  if (withCompanyName) {
    fireEvent.change(screen.getByPlaceholderText('Nom affiché sur vos annonces'), { target: { value: 'Chez Gerard' } })
  }
  fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }))
  await screen.findByText('Comment vous joindre ?')
}

async function fillStep2(withWhatsapp: boolean) {
  fireEvent.change(screen.getByPlaceholderText('exemple@email.com'), { target: { value: 'gerard.ondo@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('Ex: 66 12 34 56 (sans 0)'), { target: { value: '066123456' } })
  if (withWhatsapp) {
    fireEvent.change(screen.getByPlaceholderText("Laissez vide si c'est le même numéro"), { target: { value: '066654321' } })
  }
  fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }))
  await screen.findByText('Date de naissance day')
}

async function fillStep3() {
  fireEvent.change(screen.getByLabelText('Date de naissance day'), { target: { value: '15' } })
  fireEvent.change(screen.getByLabelText('Date de naissance month'), { target: { value: '06' } })
  fireEvent.change(screen.getByLabelText('Date de naissance year'), { target: { value: '1995' } })
  fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }))
  await screen.findByLabelText('Mot de passe')
}

function fillStep4AndSubmit() {
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: VALID_PASSWORD } })
  fireEvent.change(screen.getByLabelText('Confirmez le mot de passe'), { target: { value: VALID_PASSWORD } })
  fireEvent.click(screen.getByLabelText('termsOfPrivacyPolicy'))
  fireEvent.submit(screen.getByRole('button', { name: /créer mon compte/i }).closest('form')!)
}

describe('SignupFormModern — soumission complète', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignup.mockResolvedValue({ success: true, userId: 'new-user-1' })
  })

  it("l'inscription passe quand les champs optionnels (nom de l'entreprise, WhatsApp) sont laissés vides", async () => {
    render(<SignupFormModern />)

    await fillStep1(false)
    await fillStep2(false)
    await fillStep3()
    fillStep4AndSubmit()

    await waitFor(() => expect(mockSignup).toHaveBeenCalledTimes(1))
    const payload = mockSignup.mock.calls[0][0]
    expect(payload.pseudo).toBeUndefined()
    expect(payload.whatsappNumber).toBeUndefined()
    expect(payload.firstName).toBe('Ondo')
    expect(payload.lastName).toBe('Gerard')
    expect(payload.birthDate).toBe('1995-06-15')
    expect(mockPush).toHaveBeenCalledWith('/signup/success?uid=new-user-1')
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })

  it("l'inscription passe aussi quand tous les champs (y compris optionnels) sont remplis", async () => {
    render(<SignupFormModern />)

    await fillStep1(true)
    await fillStep2(true)
    await fillStep3()
    fillStep4AndSubmit()

    await waitFor(() => expect(mockSignup).toHaveBeenCalledTimes(1))
    const payload = mockSignup.mock.calls[0][0]
    expect(payload.pseudo).toBe('Chez Gerard')
    expect(payload.whatsappNumber).toBe('066654321')
    expect(payload.firstName).toBe('Ondo')
    expect(payload.lastName).toBe('Gerard')
    expect(mockPush).toHaveBeenCalledWith('/signup/success?uid=new-user-1')
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })
})
