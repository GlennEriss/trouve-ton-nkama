import { getAuth } from '@react-native-firebase/auth';
import { requireAuthOrRedirect } from '../authGuard';
import { navigationRef } from '../../navigation/navigationRef';

jest.mock('@react-native-firebase/auth');
jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(), navigate: jest.fn() },
}));

// Logique partagée par les deux actions protégées de la bottom nav (voir MainTabs.tsx) :
// "Publier" (PublishTabButton) et "Connexion"/"Profil" (ProfileTabButton) — un bug corrigé ici
// bénéficie aux deux d'un coup, un régression cassé les deux d'un coup.
describe('requireAuthOrRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('autorise et ne redirige pas quand un utilisateur est connecté', () => {
    (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'u1' } });

    expect(requireAuthOrRedirect()).toBe(true);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  it('bloque et redirige vers SignIn quand personne n’est connecté', () => {
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
    (navigationRef.isReady as jest.Mock).mockReturnValue(true);

    expect(requireAuthOrRedirect()).toBe(false);
    expect(navigationRef.navigate).toHaveBeenCalledWith('SignIn');
  });

  it("ne plante pas si le conteneur de navigation n'est pas encore prêt", () => {
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
    (navigationRef.isReady as jest.Mock).mockReturnValue(false);

    expect(requireAuthOrRedirect()).toBe(false);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });
});
