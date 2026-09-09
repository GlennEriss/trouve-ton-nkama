import { renderHook, act } from '@testing-library/react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useRequireAuth } from '../useRequireAuth';
import { navigationRef } from '../../navigation/navigationRef';

jest.mock('@react-native-firebase/auth');
jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(), navigate: jest.fn() },
}));

const mockedGetAuth = getAuth as jest.Mock;
const mockedIsReady = navigationRef.isReady as jest.Mock;
const mockedNavigate = navigationRef.navigate as jest.Mock;

// Miroir mobile du middleware web (PROTECTED_ROUTE_PREFIXES, src/middleware.ts) : un écran
// protégé (Favoris, Notifications, Profil) redirige automatiquement vers SignIn pour un
// visiteur non connecté, au lieu d'afficher un contenu vide indéfiniment.
describe('useRequireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsReady.mockReturnValue(true);
  });

  it('redirige vers SignIn quand aucun utilisateur (déjà déterminé)', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    const { unmount } = await renderHook(() => useRequireAuth());

    expect(mockedNavigate).toHaveBeenCalledWith('SignIn');
    unmount();
  });

  it('ne redirige pas quand un utilisateur est connecté', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    const { result, unmount } = await renderHook(() => useRequireAuth());

    expect(mockedNavigate).not.toHaveBeenCalled();
    expect(result.current.isChecking).toBe(false);
    unmount();
  });

  it('ne redirige jamais avant que navigationRef soit prêt', async () => {
    mockedIsReady.mockReturnValue(false);
    mockedGetAuth.mockReturnValue({ currentUser: null });
    const { unmount } = await renderHook(() => useRequireAuth());

    expect(mockedNavigate).not.toHaveBeenCalled();
    unmount();
  });

  it('isChecking reste vrai tant que non connecté (évite un flash de contenu protégé)', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    const { result, unmount } = await renderHook(() => useRequireAuth());

    expect(result.current.isChecking).toBe(true);
    unmount();
  });
});
