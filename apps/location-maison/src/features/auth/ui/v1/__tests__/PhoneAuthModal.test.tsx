import { describe, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PhoneAuthModal } from '../PhoneAuthModal';
import { usePhoneOtpAuth, type UsePhoneOtpAuthReturn } from '@/features/auth/hooks/usePhoneOtpAuth';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/features/auth/hooks/usePhoneOtpAuth', () => ({
  usePhoneOtpAuth: jest.fn(),
}));

const mockedUsePhoneOtpAuth = usePhoneOtpAuth as jest.MockedFunction<typeof usePhoneOtpAuth>;

function baseHookReturn(overrides: Partial<UsePhoneOtpAuthReturn> = {}): UsePhoneOtpAuthReturn {
  return {
    step: 'phone',
    phone: '',
    isSending: false,
    isVerifying: false,
    error: null,
    sendOtp: jest.fn() as unknown as UsePhoneOtpAuthReturn['sendOtp'],
    verifyOtp: jest.fn() as unknown as UsePhoneOtpAuthReturn['verifyOtp'],
    reset: jest.fn() as unknown as UsePhoneOtpAuthReturn['reset'],
    ...overrides,
  };
}

describe('PhoneAuthModal', () => {
  it('affiche le formulaire numéro (pilule indicatif + numéro), sans texte explicatif superflu', () => {
    mockedUsePhoneOtpAuth.mockReturnValue(baseHookReturn());

    render(<PhoneAuthModal open onOpenChange={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Numéro de téléphone' })).toBeInTheDocument();
    expect(screen.getByText('Indicatif')).toBeInTheDocument();
    expect(screen.getByText('Numéro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recevoir le code/ })).toBeInTheDocument();
    expect(screen.queryByText(/Numéro gabonais/)).not.toBeInTheDocument();
  });

  it('affiche 6 cases OTP à l’étape code, sans crash', () => {
    mockedUsePhoneOtpAuth.mockReturnValue(
      baseHookReturn({ step: 'otp', phone: '+241066123456' }),
    );

    render(<PhoneAuthModal open onOpenChange={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Vérification du code' })).toBeInTheDocument();
    expect(screen.getByText('Code envoyé au +241066123456')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vérifier et continuer/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier le numéro' })).toBeInTheDocument();
  });
});
