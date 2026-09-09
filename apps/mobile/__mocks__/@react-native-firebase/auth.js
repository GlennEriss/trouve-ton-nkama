// Mock manuel appliqué automatiquement à tous les tests (module dans node_modules, voir doc
// Jest sur __mocks__/<scoped-package>) — @react-native-firebase/auth est un module natif, il
// ne peut pas tourner tel quel dans l'environnement Jest.
const mockAuthState = { currentUser: null };

const auth = {
  __mockAuthState: mockAuthState,
  getAuth: jest.fn(() => mockAuthState),
  // Lit `getAuth().currentUser` DYNAMIQUEMENT à chaque appel plutôt que de fermer sur
  // `mockAuthState` capturé à la création du module : un test qui fait
  // `getAuth.mockReturnValue({currentUser:{...}})` (au lieu de muter mockAuthState.currentUser)
  // doit quand même être vu par onAuthStateChanged (utilisé par useAuthState/useRequireAuth) —
  // sinon les deux mocks divergent silencieusement (bug réel rencontré : les écrans protégés
  // ne voyaient jamais l'utilisateur mocké par les tests existants).
  onAuthStateChanged: jest.fn((_auth, callback) => {
    callback(auth.getAuth().currentUser);
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPhoneNumber: jest.fn(),
  linkWithCredential: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  getIdToken: jest.fn(async () => 'mock-id-token'),
  PhoneAuthProvider: { credential: jest.fn((verificationId, code) => ({ verificationId, code })) },
};

module.exports = auth;
