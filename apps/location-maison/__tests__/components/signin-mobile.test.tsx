import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import SigninMobileComponent from '@/components/signin/SigninMobileComponent'

const mockSigninWithGoogle = jest.fn()

jest.mock('next/font/google', () => ({ Inter: () => ({ className: 'inter' }) }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={String(href)} {...props}>{children}</a>,
}))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('@/features/auth/hooks', () => ({
  useSignin: () => ({
    signinWithCredentials: jest.fn(),
    signinWithGoogle: mockSigninWithGoogle,
    isLoading: false,
    isCredentialsLoading: false,
    isGoogleLoading: false,
    lastError: null,
    clearError: jest.fn(),
  }),
  mapSigninError: () => ({ title: 'Erreur', description: 'Erreur' }),
}))
jest.mock('@/components/ui/form', () => ({ Form: ({ children }: any) => <>{children}</> }))
jest.mock('react-hook-form', () => {
  const ReactModule = require('react') as typeof React
  return {
    useForm: ({ defaultValues }: any) => {
      const [values, setValues] = ReactModule.useState(defaultValues)
      const control = { values, setValue: (name: string, value: any) => setValues((old: any) => ({ ...old, [name]: value })) }
      return {
        control,
        watch: (name: string) => values[name],
        setValue: control.setValue,
        formState: { isSubmitting: false },
        handleSubmit: (cb: any) => (e: React.FormEvent) => { e.preventDefault(); return cb(values) },
      }
    },
  }
})
jest.mock('@/components/shared/form/InputFormApp', () => ({
  InputFormApp: ({ control, name, label }: any) => (
    <label>{label}<input aria-label={label || name} value={control.values[name] ?? ''} onChange={(e) => control.setValue(name, e.target.value)} /></label>
  ),
}))
jest.mock('@/components/shared/ui/ButtonApp', () => ({
  ButtonApp: ({ title, isLoading: _l, ...props }: any) => <button {...props}>{title}</button>,
}))
jest.mock('@/features/auth/ui/v1/PhoneAuthModal', () => ({
  PhoneAuthModal: ({ open }: any) => (open ? <div role="dialog">Modale téléphone</div> : null),
}))
jest.mock('@/features/analytics/tracking', () => ({
  trackingEvents: { CTA_AUTH_SIGNIN_CLICK: 'cta_auth_signin_click' },
  useTrackEvent: () => ({ trackEvent: jest.fn() }),
}))

describe('SigninMobileComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('propose la connexion par téléphone et ouvre la modale OTP (parité avec le desktop)', () => {
    render(<SigninMobileComponent />)
    const phoneButton = screen.getByRole('button', { name: /Continuer avec Numéro de téléphone/ })
    expect(phoneButton).toBeInTheDocument()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(phoneButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('propose toujours la connexion Google', () => {
    render(<SigninMobileComponent />)
    fireEvent.click(screen.getByRole('button', { name: /Continuer avec Google/ }))
    expect(mockSigninWithGoogle).toHaveBeenCalled()
  })
})
