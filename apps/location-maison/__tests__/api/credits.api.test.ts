import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
const mockAdminAuth = {
  verifyIdToken: jest.fn()
};

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(() => ({
    where: jest.fn(() => ({
      limit: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  }))
};

// Mock des docs Firestore
const mockDocRef = {
  update: jest.fn(),
  data: jest.fn()
};

const mockSnapshot = {
  empty: false,
  docs: [mockDocRef]
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
  FieldValue: {
    serverTimestamp: () => 'TIMESTAMP'
  }
}));

jest.mock('@/firebase/admin', () => ({
  adminAuth: mockAdminAuth
}));

// Import des routes après les mocks
import { GET as getBalance } from '@/app/api/credits/balance/route';

describe('Credits API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configuration par défaut des mocks
    mockFirestore.collection.mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(mockSnapshot)
        })
      })
    });
    
    mockDocRef.data.mockReturnValue({
      uid: 'test-user-123',
      credits: 50
    });
  });

  describe('GET /api/credits/balance', () => {
    test('devrait retourner le solde avec un token valide', async () => {
      const mockDecodedToken = { uid: 'test-user-123' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-firebase-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.credits).toBe(50);
      expect(data.message).toContain('50 crédits');
      expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledWith('valid-firebase-token');
    });

    test('devrait retourner une erreur sans token d\'autorisation', async () => {
      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET'
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Token d\'authentification requis');
    });

    test('devrait retourner une erreur avec un token invalide', async () => {
      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'InvalidToken'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Token d\'authentification requis');
    });

    test('devrait gérer un token Bearer malformé', async () => {
      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Token d\'authentification requis');
    });

    test('devrait initialiser les crédits à 3 pour un nouvel utilisateur', async () => {
      const mockDecodedToken = { uid: 'new-user-123' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      // Simuler un utilisateur sans crédits
      mockDocRef.data.mockReturnValue({
        uid: 'new-user-123'
        // credits: undefined
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.credits).toBe(3);
      expect(data.message).toContain('3 crédits gratuits');
      expect(mockDocRef.update).toHaveBeenCalledWith({
        credits: 3,
        updatedAt: 'TIMESTAMP'
      });
    });

    test('devrait retourner une erreur si utilisateur non trouvé', async () => {
      const mockDecodedToken = { uid: 'nonexistent-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      // Simuler un snapshot vide
      const emptySnapshot = { empty: true, docs: [] };
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(emptySnapshot)
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Profil utilisateur non trouvé');
    });

    test('devrait gérer les tokens Firebase expirés', async () => {
      const expiredError = new Error('Token expired');
      (expiredError as any).code = 'auth/id-token-expired';
      mockAdminAuth.verifyIdToken.mockRejectedValue(expiredError);

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer expired-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Session expirée, veuillez vous reconnecter');
    });

    test('devrait gérer les tokens Firebase invalides', async () => {
      const invalidError = new Error('Invalid token');
      (invalidError as any).code = 'auth/invalid-id-token';
      mockAdminAuth.verifyIdToken.mockRejectedValue(invalidError);

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Token d\'authentification invalide');
    });

    test('devrait gérer différents soldes de crédits', async () => {
      const testCases = [
        { credits: 0, expectedMessage: '0 crédit' },
        { credits: 1, expectedMessage: '1 crédit' },
        { credits: 2, expectedMessage: '2 crédits' },
        { credits: 100, expectedMessage: '100 crédits' },
        { credits: 1000, expectedMessage: '1000 crédits' }
      ];

      for (const testCase of testCases) {
        const mockDecodedToken = { uid: 'test-user' };
        mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

        mockDocRef.data.mockReturnValue({
          uid: 'test-user',
          credits: testCase.credits
        });

        const request = new NextRequest('http://localhost:3000/api/credits/balance', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        const response = await getBalance(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.credits).toBe(testCase.credits);
        expect(data.message).toContain(testCase.expectedMessage);

        // Reset pour le test suivant
        jest.clearAllMocks();
      }
    });

    test('devrait gérer les erreurs Firestore', async () => {
      const mockDecodedToken = { uid: 'test-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      // Simuler une erreur Firestore
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockRejectedValue(new Error('Firestore connection error'))
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Erreur lors de la récupération du solde');
    });

    test('devrait gérer les crédits négatifs', async () => {
      const mockDecodedToken = { uid: 'debt-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      mockDocRef.data.mockReturnValue({
        uid: 'debt-user',
        credits: -5
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.credits).toBe(-5);
      expect(data.message).toContain('-5 crédits');
    });

    test('devrait gérer les crédits null', async () => {
      const mockDecodedToken = { uid: 'null-credits-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      mockDocRef.data.mockReturnValue({
        uid: 'null-credits-user',
        credits: null
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.credits).toBe(3); // Devrait initialiser à 3
      expect(data.message).toContain('3 crédits gratuits');
    });
  });

  describe('Sécurité et validation', () => {
    test('devrait rejeter les requêtes avec des headers malicieux', async () => {
      const maliciousHeaders = [
        { 'Authorization': 'Bearer <script>alert("xss")</script>' },
        { 'Authorization': 'Bearer ../../etc/passwd' },
        { 'Authorization': 'Bearer \x00\x01\x02' }
      ];

      for (const headers of maliciousHeaders) {
        // Firebase devrait rejeter ces tokens
        mockAdminAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token format'));

        const request = new NextRequest('http://localhost:3000/api/credits/balance', {
          method: 'GET',
          headers
        });

        const response = await getBalance(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);

        jest.clearAllMocks();
      }
    });

    test('devrait valider la structure du token décodé', async () => {
      // Token sans UID
      mockAdminAuth.verifyIdToken.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token-without-uid'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      // L'API devrait chercher un utilisateur avec UID undefined
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    test('devrait gérer les tokens très longs', async () => {
      const longToken = 'a'.repeat(5000);
      mockAdminAuth.verifyIdToken.mockRejectedValue(new Error('Token too long'));

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${longToken}`
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Performance et robustesse', () => {
    test('devrait gérer les appels concurrents', async () => {
      const mockDecodedToken = { uid: 'concurrent-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      mockDocRef.data.mockReturnValue({
        uid: 'concurrent-user',
        credits: 25
      });

      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/credits/balance', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer concurrent-token'
          }
        })
      );

      const responses = await Promise.all(
        requests.map(request => getBalance(request))
      );

      for (const response of responses) {
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.credits).toBe(25);
      }

      expect(mockAdminAuth.verifyIdToken).toHaveBeenCalledTimes(5);
    });

    test('devrait gérer les timeouts Firestore', async () => {
      const mockDecodedToken = { uid: 'timeout-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      // Simuler un timeout Firestore
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation(() => 
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 100)
              )
            )
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer timeout-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Erreur lors de la récupération du solde');
    });

    test('devrait exposer les détails d\'erreur en développement', async () => {
      // Sauvegarder l'environnement actuel
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockDecodedToken = { uid: 'dev-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      const testError = new Error('Detailed development error');
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockRejectedValue(testError)
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer dev-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Detailed development error');

      // Restaurer l'environnement
      process.env.NODE_ENV = originalEnv;
    });

    test('ne devrait pas exposer les détails d\'erreur en production', async () => {
      // Sauvegarder l'environnement actuel
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockDecodedToken = { uid: 'prod-user' };
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      const testError = new Error('Sensitive production error');
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockRejectedValue(testError)
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer prod-token'
        }
      });

      const response = await getBalance(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeUndefined();

      // Restaurer l'environnement
      process.env.NODE_ENV = originalEnv;
    });
  });
});
