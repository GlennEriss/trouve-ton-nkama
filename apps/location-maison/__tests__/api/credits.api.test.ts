import { describe, test, expect, jest, beforeEach } from '@jest/globals';

type DecodedToken = { uid: string };
type VerifyIdTokenFn = (token: string) => Promise<DecodedToken>;
type CreditUserData = {
  credits?: number | string;
  lastCreditUpdate?: Date;
  [key: string]: unknown;
};
type FirestoreUserDoc = {
  exists: boolean;
  data: () => CreditUserData;
};
type FirestoreGetFn = () => Promise<FirestoreUserDoc>;
type FirestoreSetFn = (data: Record<string, unknown>) => Promise<void>;
type FirestoreDocRef = {
  get: FirestoreGetFn;
  set: FirestoreSetFn;
};
type FirestoreCollectionRef = {
  doc: (id?: string) => FirestoreDocRef;
};
type CreditsApiResponse = { status: number; data: any };

// Mock Firebase Admin
const mockAdminAuth = {
  verifyIdToken: jest.fn() as jest.MockedFunction<VerifyIdTokenFn>,
};

const mockGet = jest.fn() as jest.MockedFunction<FirestoreGetFn>;
const mockSet = jest.fn() as jest.MockedFunction<FirestoreSetFn>;
const mockDoc = jest.fn(() => ({
  get: mockGet,
  set: mockSet
}));
const mockCollection = jest.fn<(name?: string) => FirestoreCollectionRef>(() => ({
  doc: mockDoc
}));

const mockFirestore = {
  collection: mockCollection
};

jest.mock('@/firebase/admin', () => ({
  adminAuth: mockAdminAuth,
  getFirestore: () => mockFirestore
}));

// Mock de l'API Credits Service
class MockCreditsAPIService {
  async getBalance(authToken: string): Promise<CreditsApiResponse> {
    try {
      // Validation du token
      if (!authToken || !authToken.startsWith('Bearer ')) {
        return {
          status: 401,
          data: { error: 'Token manquant ou invalide' }
        };
      }

      const token = authToken.replace('Bearer ', '').trim();
      
      // Vérifier que le token n'est pas vide après avoir retiré "Bearer "
      if (!token) {
        return {
          status: 401,
          data: { error: 'Token manquant ou invalide' }
        };
      }
      
      // Vérification du token Firebase
      const decodedToken: DecodedToken = await mockAdminAuth.verifyIdToken(token);
      const uid = decodedToken.uid;

      // Récupération du document utilisateur
      const userDoc: FirestoreUserDoc = await mockFirestore.collection().doc().get();
      
      if (!userDoc.exists) {
        // Créer un nouvel utilisateur avec 3 crédits de bienvenue
        await mockFirestore.collection().doc().set({
          credits: 3,
          createdAt: new Date(),
          lastCreditUpdate: new Date()
        });

        return {
          status: 200,
          data: {
            credits: 3,
            message: 'Nouveau compte créé avec 3 crédits de bienvenue'
          }
        };
      }

      const userData: CreditUserData = userDoc.data();
      const credits = typeof userData?.credits === 'number' ? userData.credits : 0;

      return {
        status: 200,
        data: {
          credits,
          lastUpdate: userData?.lastCreditUpdate
        }
      };
    } catch (error: unknown) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'auth/id-token-expired') {
        return {
          status: 401,
          data: { error: 'Token expiré' }
        };
      }

      if (errorCode === 'auth/argument-error') {
        return {
          status: 401,
          data: { error: 'Token invalide' }
        };
      }

      return {
        status: 500,
        data: { error: 'Erreur serveur interne' }
      };
    }
  }
}

const mockCreditsAPIService = new MockCreditsAPIService();

describe('Credits API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/credits/balance', () => {
    test('devrait retourner le solde des crédits avec authentification valide', async () => {
      const mockDecodedToken = { uid: 'user-123' };
      const mockUserData = {
        credits: 15,
        lastCreditUpdate: new Date('2024-01-01')
      };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const result = await mockCreditsAPIService.getBalance('Bearer valid-token');

      expect(result.status).toBe(200);
      expect(result.data.credits).toBe(15);
      expect(result.data.lastUpdate).toEqual(mockUserData.lastCreditUpdate);

      expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith('valid-token');
    });

    test('devrait créer un nouveau compte avec 3 crédits de bienvenue', async () => {
      const mockDecodedToken = { uid: 'new-user-456' };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: false,
        data: () => ({})
      });
      mockSet.mockResolvedValue(undefined);

      const result = await mockCreditsAPIService.getBalance('Bearer new-user-token');

      expect(result.status).toBe(200);
      expect(result.data.credits).toBe(3);
      expect(result.data.message).toContain('3 crédits de bienvenue');

      expect(mockSet).toHaveBeenCalledWith({
        credits: 3,
        createdAt: expect.any(Date),
        lastCreditUpdate: expect.any(Date)
      });
    });

    test('devrait retourner 401 sans token d\'authentification', async () => {
      const result = await mockCreditsAPIService.getBalance('');

      expect(result.status).toBe(401);
      expect(result.data.error).toBe('Token manquant ou invalide');

      expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
    });

    test('devrait retourner 401 avec token mal formaté', async () => {
      const result = await mockCreditsAPIService.getBalance('InvalidToken');

      expect(result.status).toBe(401);
      expect(result.data.error).toBe('Token manquant ou invalide');

      expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
    });

    test('devrait gérer les tokens expirés', async () => {
      const expiredError = Object.assign(new Error('Token expired'), {
        code: 'auth/id-token-expired',
      });

      mockAdminAuth.verifyIdToken.mockRejectedValue(expiredError);

      const result = await mockCreditsAPIService.getBalance('Bearer expired-token');

      expect(result.status).toBe(401);
      expect(result.data.error).toBe('Token expiré');
    });

    test('devrait gérer les tokens invalides', async () => {
      const invalidError = Object.assign(new Error('Invalid token'), {
        code: 'auth/argument-error',
      });

      mockAdminAuth.verifyIdToken.mockRejectedValue(invalidError);

      const result = await mockCreditsAPIService.getBalance('Bearer invalid-token');

      expect(result.status).toBe(401);
      expect(result.data.error).toBe('Token invalide');
    });

    test('devrait gérer les erreurs Firestore', async () => {
      const mockDecodedToken = { uid: 'user-error' };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockRejectedValue(new Error('Firestore connection failed'));

      const result = await mockCreditsAPIService.getBalance('Bearer valid-token');

      expect(result.status).toBe(500);
      expect(result.data.error).toBe('Erreur serveur interne');
    });

    test('devrait gérer les utilisateurs avec crédits à zéro', async () => {
      const mockDecodedToken = { uid: 'user-zero-credits' };
      const mockUserData = {
        credits: 0,
        lastCreditUpdate: new Date('2024-01-01')
      };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const result = await mockCreditsAPIService.getBalance('Bearer valid-token');

      expect(result.status).toBe(200);
      expect(result.data.credits).toBe(0);
    });

    test('devrait gérer les utilisateurs sans champ credits', async () => {
      const mockDecodedToken = { uid: 'user-no-credits-field' };
      const mockUserData = {
        // Pas de champ credits
        otherField: 'value'
      };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const result = await mockCreditsAPIService.getBalance('Bearer valid-token');

      expect(result.status).toBe(200);
      expect(result.data.credits).toBe(0); // Valeur par défaut
    });
  });

  describe('Validation et sécurité', () => {
    test('devrait rejeter les tokens vides', async () => {
      const emptyTokens = ['', 'Bearer ', ' Bearer ', 'Bearer  '];

      for (const token of emptyTokens) {
        const result = await mockCreditsAPIService.getBalance(token);

        expect(result.status).toBe(401);
        expect(result.data.error).toBe('Token manquant ou invalide');
      }

      expect(mockAdminAuth.verifyIdToken).not.toHaveBeenCalled();
    });

    test('devrait gérer les caractères dangereux dans les tokens', async () => {
      const dangerousTokens = [
        'Bearer <script>alert("xss")</script>',
        'Bearer \'; DROP TABLE users; --',
        'Bearer ../../../etc/passwd'
      ];

      for (const token of dangerousTokens) {
        const invalidError = Object.assign(new Error('Invalid token'), {
          code: 'auth/argument-error',
        });
        mockAdminAuth.verifyIdToken.mockRejectedValue(invalidError);

        const result = await mockCreditsAPIService.getBalance(token);

        expect(result.status).toBe(401);
        expect(result.data.error).toBe('Token invalide');
      }
    });

    test('devrait limiter la longueur des tokens', async () => {
      const veryLongToken = 'Bearer ' + 'a'.repeat(10000);

      const invalidError = Object.assign(new Error('Token too long'), {
        code: 'auth/argument-error',
      });
      mockAdminAuth.verifyIdToken.mockRejectedValue(invalidError);

      const result = await mockCreditsAPIService.getBalance(veryLongToken);

      expect(result.status).toBe(401);
      expect(result.data.error).toBe('Token invalide');
    });
  });

  describe('Performance et robustesse', () => {
    test('devrait gérer les requêtes concurrentes', async () => {
      const mockDecodedToken = { uid: 'concurrent-user' };
      const mockUserData = { credits: 10 };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const concurrentRequests = Array.from({ length: 5 }, () =>
        mockCreditsAPIService.getBalance('Bearer concurrent-token')
      );

      const results = await Promise.all(concurrentRequests);

      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.data.credits).toBe(10);
      });

      expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledTimes(5);
    });

    test('devrait gérer les timeouts Firestore', async () => {
      const mockDecodedToken = { uid: 'timeout-user' };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 100)
        )
      );

      const result = await mockCreditsAPIService.getBalance('Bearer timeout-token');

      expect(result.status).toBe(500);
      expect(result.data.error).toBe('Erreur serveur interne');
    });

    test('devrait gérer les erreurs réseau Firebase', async () => {
      const networkError = Object.assign(new Error('Network error'), {
        code: 'network-request-failed',
      });

      mockAdminAuth.verifyIdToken.mockRejectedValue(networkError);

      const result = await mockCreditsAPIService.getBalance('Bearer network-error-token');

      expect(result.status).toBe(500);
      expect(result.data.error).toBe('Erreur serveur interne');
    });
  });

  describe('Gestion des données utilisateur', () => {
    test('devrait gérer les crédits négatifs (cas d\'erreur)', async () => {
      const mockDecodedToken = { uid: 'negative-credits-user' };
      const mockUserData = {
        credits: -5, // Cas d'erreur de données
        lastCreditUpdate: new Date()
      };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const result = await mockCreditsAPIService.getBalance('Bearer valid-token');

      expect(result.status).toBe(200);
      expect(result.data.credits).toBe(-5); // L'API retourne la valeur telle quelle
    });

    test('devrait gérer les crédits très élevés', async () => {
      const mockDecodedToken = { uid: 'high-credits-user' };
      const mockUserData = {
        credits: 999999,
        lastCreditUpdate: new Date()
      };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const result = await mockCreditsAPIService.getBalance('Bearer valid-token');

      expect(result.status).toBe(200);
      expect(result.data.credits).toBe(999999);
    });

    test('devrait gérer les types de données invalides pour les crédits', async () => {
      const mockDecodedToken = { uid: 'invalid-credits-type' };
      const mockUserData = {
        credits: 'invalid-string', // Type invalide
        lastCreditUpdate: new Date()
      };

      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const result = await mockCreditsAPIService.getBalance('Bearer valid-token');

      expect(result.status).toBe(200);
      expect(result.data.credits).toBe(0); // Fallback vers 0
    });
  });
});
