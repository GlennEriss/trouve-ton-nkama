import { describe, it, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignupFormModern } from '../SignupFormModern';
import { useSignup } from '../../../hooks';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signIn } from 'next-auth/react';
import { SignupData, SignupResult } from '../../../services/auth.service.interface';

jest.mock('../../../hooks', () => ({
  useSignup: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

jest.mock('framer-motion', () => {
  const React = require('react');

  const FRAMER_PROPS = new Set([
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'whileHover',
    'whileTap',
    'layoutId',
    'custom',
  ]);

  const toElement = (tag: string) => ({ children, ...props }: any) => {
    const cleanProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props || {})) {
      if (!FRAMER_PROPS.has(key)) {
        cleanProps[key] = value;
      }
    }

    const safeTag = ['button', 'h1', 'h2', 'h3', 'p', 'span', 'div'].includes(tag) ? tag : 'div';
    return React.createElement(safeTag, cleanProps, children);
  };

  const motion = new Proxy(
    {},
    {
      get: (_, prop: string) => toElement(prop),
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
  };
});

const mockUseSignup = useSignup as jest.MockedFunction<typeof useSignup>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

describe('SignupFormModern', () => {
  const mockPush = jest.fn();
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: [],
    } as any);

    mockUseSignup.mockReturnValue({
      signup: jest.fn<(data: SignupData) => Promise<SignupResult>>().mockResolvedValue({
        success: true,
        userId: 'user-123',
      }),
      isLoading: false,
      error: null,
      userId: null,
      reset: jest.fn(),
    });
  });

  it('renders first step with expected title and navigation', () => {
    render(<SignupFormModern />);

    expect(screen.getByText('Qui êtes-vous ?')).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continuer$/i })).toBeInTheDocument();
  });

  it('calls google sign-in when social button is clicked', () => {
    render(<SignupFormModern />);

    fireEvent.click(screen.getByRole('button', { name: /continuer avec google/i }));

    expect(mockSignIn).toHaveBeenCalledWith('google');
  });

  // Régression 2026-08-18 : « Continuer » restait désactivé quand un champ pourtant
  // annoncé comme facultatif était laissé vide (le libellé/placeholder promettait
  // l'inverse). Ces deux tests verrouillent chaque champ `.optional()` du schéma.
  it('laisse passer l etape 1 avec le pseudo (optionnel) vide', () => {
    render(<SignupFormModern />);

    fireEvent.change(screen.getByPlaceholderText('Entrez votre nom'), { target: { value: 'Ondo' } });
    fireEvent.change(screen.getByPlaceholderText(/pr[ée]nom/i), { target: { value: 'Gerard' } });
    // Pseudo volontairement laissé vide.

    expect(screen.getByRole('button', { name: /^continuer$/i })).toBeEnabled();
  });

  it('laisse passer l etape 2 avec le numero WhatsApp vide', async () => {
    render(<SignupFormModern />);

    fireEvent.change(screen.getByPlaceholderText('Entrez votre nom'), { target: { value: 'Ondo' } });
    fireEvent.change(screen.getByPlaceholderText(/pr[ée]nom/i), { target: { value: 'Gerard' } });
    fireEvent.click(screen.getByRole('button', { name: /^continuer$/i }));

    expect(await screen.findByText('Comment vous joindre ?')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('exemple@email.com'), {
      target: { value: 'gerard@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: 66 12 34 56/), { target: { value: '66123456' } });
    // Numéro WhatsApp volontairement laissé vide (« Laissez vide si c'est le même numéro »).

    expect(screen.getByRole('button', { name: /^continuer$/i })).toBeEnabled();
  });

  it('disables google sign-in button when signup is loading', () => {
    mockUseSignup.mockReturnValue({
      signup: jest.fn<(data: SignupData) => Promise<SignupResult>>(),
      isLoading: true,
      error: null,
      userId: null,
      reset: jest.fn(),
    });

    render(<SignupFormModern />);

    expect(screen.getByRole('button', { name: /continuer avec google/i })).toBeDisabled();
  });
});
