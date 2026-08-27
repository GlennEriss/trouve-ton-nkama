/**
 * useSignOut (2026-08-26) — verrouille le fix d'un vrai bug rapporté par un utilisateur :
 * "Se déconnecter" cliqué de nombreuses fois, rien ne se passe. Root cause : les deux boutons
 * live appelaient `signOut()` de next-auth/react SANS options, donc `redirect: true` +
 * `redirectTo: window.location.href` — un rechargement complet de la MÊME page qui écrasait
 * le toast et le `router.push` avant qu'ils ne s'exécutent. Ce hook centralise le fix
 * (`redirect: false` + navigation explicite) et empêche la régression de revenir dans un seul
 * des call sites.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { routes } from '@/constantes/routes';
import { useSignOut } from '../useSignOut';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockToast = jest.fn();
const mockFirebaseSignOut = jest.fn() as jest.MockedFunction<(auth: unknown) => Promise<void>>;

jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/hooks/use-toast', () => ({ useToast: jest.fn() }));
jest.mock('@/firebase/auth', () => ({
  auth: {},
  signOut: (auth: unknown) => mockFirebaseSignOut(auth),
}));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: jest.fn(), error: jest.fn() }),
}));

const mockNextAuthSignOut = nextAuthSignOut as jest.MockedFunction<typeof nextAuthSignOut>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('useSignOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush, refresh: mockRefresh } as any);
    mockUseToast.mockReturnValue({ toast: mockToast } as any);
    mockFirebaseSignOut.mockResolvedValue(undefined);
    mockNextAuthSignOut.mockResolvedValue(undefined as any);
  });

  it("appelle next-auth signOut avec redirect:false — jamais sans options (c'était le bug)", async () => {
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockNextAuthSignOut).toHaveBeenCalledWith({ redirect: false });
  });

  it('navigue explicitement et rafraîchit après la déconnexion (au lieu du hard-reload de next-auth)', async () => {
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockPush).toHaveBeenCalledWith(routes.public.homePage);
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Déconnexion' }));
  });

  it('respecte une cible de redirection personnalisée (ex: /signin depuis complete-profile)', async () => {
    const { result } = renderHook(() => useSignOut(routes.public.signin));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockPush).toHaveBeenCalledWith(routes.public.signin);
  });

  it("continue la déconnexion NextAuth même si la déconnexion Firebase échoue (best-effort)", async () => {
    mockFirebaseSignOut.mockRejectedValue(new Error('no firebase session'));
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockNextAuthSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockPush).toHaveBeenCalled();
  });

  it('affiche une erreur et ne navigue pas si la déconnexion NextAuth échoue', async () => {
    mockNextAuthSignOut.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignore les clics répétés pendant qu'une déconnexion est déjà en cours (rage-click)", async () => {
    let resolveSignOut: () => void = () => {};
    mockNextAuthSignOut.mockReturnValue(new Promise((resolve) => { resolveSignOut = () => resolve(undefined as any); }));
    const { result } = renderHook(() => useSignOut());

    let firstCall: Promise<void>;
    act(() => {
      firstCall = result.current.signOut();
    });
    await waitFor(() => expect(result.current.isSigningOut).toBe(true));

    // Deuxième clic pendant que le premier est encore en vol : ne doit rien déclencher de plus.
    await act(async () => {
      await result.current.signOut();
    });
    expect(mockNextAuthSignOut).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSignOut();
      await firstCall!;
    });
  });
});
