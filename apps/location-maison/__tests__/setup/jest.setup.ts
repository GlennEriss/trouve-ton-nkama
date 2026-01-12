/**
 * Configuration globale de Jest
 * Ce fichier est exécuté avant chaque test
 */

import '@testing-library/jest-dom';

// =============================================================================
// MOCKS GLOBAUX
// =============================================================================

// Mock de console.error pour ignorer certains warnings React
const originalError = console.error;
console.error = (...args: any[]) => {
  // Ignorer les warnings de React pour act()
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Mock de console.warn pour les tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  // Ignorer certains warnings dans les tests
  if (
    typeof args[0] === 'string' &&
    args[0].includes('React Router Future Flag Warning')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// =============================================================================
// MOCK FIREBASE
// =============================================================================

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  FacebookAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

// =============================================================================
// MOCK NEXT.JS
// =============================================================================

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => new Headers()),
}));

// =============================================================================
// MOCK ENVIRONMENT VARIABLES
// =============================================================================

process.env = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abc123',
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
};

// =============================================================================
// UTILITIES
// =============================================================================

// Reset des factories avant chaque test
beforeEach(() => {
  // Les factories sont réinitialisées manuellement si nécessaire
  // Cela permet de garder le contrôle sur les IDs générés
});

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// EXTENSIONS
// =============================================================================

// Extension pour les matchers personnalisés (optionnel)
// expect.extend({
//   toBeWithinRange(received, floor, ceiling) {
//     const pass = received >= floor && received <= ceiling;
//     return {
//       message: () =>
//         `expected ${received} to be within range ${floor} - ${ceiling}`,
//       pass,
//     };
//   },
// });

// =============================================================================
// GLOBAL TYPES
// =============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      // Ajoutez vos matchers personnalisés ici
      // toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

export {};

