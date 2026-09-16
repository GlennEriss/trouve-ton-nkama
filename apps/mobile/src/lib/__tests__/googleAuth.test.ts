import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { getDoc, setDoc, updateDoc } from '@react-native-firebase/firestore';
import { signInWithGoogle, mapGoogleSignInError, GoogleSignInCancelledError } from '../googleAuth';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
// Le setup jest officiel du package (voir jest.config.js, setupFiles) ne mocke que le
// TurboModule natif sous-jacent — GoogleSignin.signIn reste la vraie fonction JS qui l'enrobe,
// donc pas un jest.fn() directement contrôlable. On mocke ici GoogleSignin lui-même (signIn,
// hasPlayServices, configure) tout en gardant les vraies fonctions pures (isCancelledResponse,
// isSuccessResponse, isErrorWithCode, statusCodes), qui n'ont aucune dépendance native.
jest.mock('@react-native-google-signin/google-signin', () => {
  const actual = jest.requireActual('@react-native-google-signin/google-signin');
  return {
    ...actual,
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn().mockResolvedValue(true),
      signIn: jest.fn(),
    },
  };
});

const mockedSignIn = GoogleSignin.signIn as jest.Mock;
const mockedSignInWithCredential = signInWithCredential as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

const GOOGLE_USER = {
  idToken: 'id-token-abc',
  serverAuthCode: null,
  scopes: [],
  user: { id: 'g1', name: 'Jean Mba', email: 'jean@gmail.com', photo: 'https://photo', familyName: 'Mba', givenName: 'Jean' },
};

// Miroir de oauth-google.service.ts (web) — voir [[feedback-mobile-reuse-pwa-design]] et le
// commentaire détaillé dans googleAuth.ts sur l'écart d'architecture assumé (Firebase Auth côté
// serveur pour le web vs directement sur l'appareil pour le mobile, qui n'a pas de couche
// NextAuth).
describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({});
    mockedSignIn.mockResolvedValue({ type: 'success', data: GOOGLE_USER });
    mockedSignInWithCredential.mockResolvedValue({ user: { uid: 'uid-1', email: 'jean@gmail.com' } });
  });

  it('crée un nouveau document Firestore (providers GOOGLE, profil vide) pour un premier compte Google', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => false });

    const result = await signInWithGoogle();

    expect(mockedSignIn).toHaveBeenCalled();
    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('id-token-abc');
    expect(mockedSetDoc).toHaveBeenCalled();
    const [, savedDoc] = mockedSetDoc.mock.calls[0];
    expect(savedDoc).toMatchObject({
      uid: 'uid-1',
      email: 'jean@gmail.com',
      firstname: '',
      lastname: '',
      providers: ['GOOGLE'],
      roles: ['User'],
      credits: 3,
      state: 'IN_PROGRESS',
      metadata: { needsProfileCompletion: true },
      image: 'https://photo',
    });
    expect(result).toEqual({ uid: 'uid-1', isNewUser: true });
  });

  it("rattache le provider GOOGLE à un compte existant (email/mot de passe) sans écraser son profil", async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ providers: ['CREDENTIALS'] }) });

    const result = await signInWithGoogle();

    expect(mockedSetDoc).not.toHaveBeenCalled();
    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { providers: ['CREDENTIALS', 'GOOGLE'] });
    expect(result).toEqual({ uid: 'uid-1', isNewUser: false });
  });

  it("ne retouche pas providers si GOOGLE y est déjà (connexions Google répétées)", async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ providers: ['GOOGLE'] }) });

    await signInWithGoogle();

    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });

  it('lève GoogleSignInCancelledError si l\'utilisateur annule (pas d\'erreur affichée)', async () => {
    mockedSignIn.mockResolvedValue({ type: 'cancelled' });

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleSignInCancelledError);
    expect(mockedSignInWithCredential).not.toHaveBeenCalled();
  });
});

describe('mapGoogleSignInError', () => {
  it('retourne null pour une annulation (pas de message à afficher)', () => {
    expect(mapGoogleSignInError(new GoogleSignInCancelledError())).toBeNull();
  });

  it('retourne un message clair pour Play Services indisponible', () => {
    const err = Object.assign(new Error('x'), { code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE });
    expect(mapGoogleSignInError(err)).toMatch(/Play Services/);
  });

  it("retourne un message clair si le fournisseur Google est désactivé côté Firebase", () => {
    expect(mapGoogleSignInError({ code: 'auth/operation-not-allowed' })).toMatch(/pas activée/);
  });

  it('retourne un message générique pour une erreur inconnue', () => {
    expect(mapGoogleSignInError(new Error('boom'))).toBe('Impossible de se connecter avec Google. Réessayez.');
  });
});
