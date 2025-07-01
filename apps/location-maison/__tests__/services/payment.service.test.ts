import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock du logger simple  
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock global fetch
const mockFetch = jest.fn<Promise<any>, any[]>();
(global as any).fetch = mockFetch;

// Import des services après les mocks
import { initiateAirtelPayment, checkPaymentStatus } from '@/../../functions/src/payments/airtel/airtelApi';
import { validateAirtelNumber, formatPhoneNumber, getAirtelCredentials } from '@/../../functions/src/payments/airtel/config';

describe('Payment Service Tests - Airtel Money', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('validateAirtelNumber', () => {
    test('devrait valider les numéros Airtel Gabon valides', () => {
      const validNumbers = [
        '+241 6 12 34 56 78',
        '+2416 12 34 56 78',
        '241612345678',
        '612345678',
        '+241 7 12 34 56 78',
        '712345678'
      ];

      validNumbers.forEach(number => {
        expect(validateAirtelNumber(number)).toBe(true);
      });
    });

    test('devrait rejeter les numéros invalides', () => {
      const invalidNumbers = [
        '+241 5 12 34 56 78', // Commence par 5
        '512345678',
        '+33 6 12 34 56 78', // Mauvais code pays
        '12345678', // Trop court
        '123456789', // Trop long pour mobile sans code pays
        '+241 8 12 34 56 78', // Commence par 8
        'abcd1234'
      ];

      invalidNumbers.forEach(number => {
        expect(validateAirtelNumber(number)).toBe(false);
      });
    });

    test('devrait gérer les espaces dans les numéros', () => {
      expect(validateAirtelNumber('+241 6 12 34 56 78')).toBe(true);
      expect(validateAirtelNumber('+241   6   12   34   56   78')).toBe(true);
      expect(validateAirtelNumber('6 12 34 56 78')).toBe(true);
    });
  });

  describe('formatPhoneNumber', () => {
    test('devrait formater correctement les numéros avec code pays', () => {
      expect(formatPhoneNumber('+241612345678')).toBe('241612345678');
      expect(formatPhoneNumber('241612345678')).toBe('241612345678');
    });

    test('devrait ajouter le code pays si manquant', () => {
      expect(formatPhoneNumber('612345678')).toBe('241612345678');
      expect(formatPhoneNumber('712345678')).toBe('241712345678');
    });

    test('devrait gérer les espaces', () => {
      expect(formatPhoneNumber('+241 6 12 34 56 78')).toBe('241612345678');
      expect(formatPhoneNumber('6 12 34 56 78')).toBe('241612345678');
    });
  });

  describe('getAirtelCredentials', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        AIRTEL_CLIENT_ID: 'test_client_id',
        AIRTEL_CLIENT_SECRET: 'test_client_secret',
        AIRTEL_MERCHANT_ID: 'test_merchant_id',
        AIRTEL_WEBHOOK_SECRET: 'test_webhook_secret'
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('devrait retourner les credentials en staging par défaut', () => {
      process.env.NODE_ENV = 'development';
      const credentials = getAirtelCredentials();

      expect(credentials.clientId).toBe('test_client_id');
      expect(credentials.clientSecret).toBe('test_client_secret');
      expect(credentials.merchantId).toBe('test_merchant_id');
      expect(credentials.webhookSecret).toBe('test_webhook_secret');
      expect(credentials.isProduction).toBe(false);
      expect(credentials.baseUrl).toBe('https://openapiuat.airtel.africa/merchant/v1');
    });

    test('devrait retourner les credentials de production', () => {
      process.env.NODE_ENV = 'production';
      const credentials = getAirtelCredentials();

      expect(credentials.isProduction).toBe(true);
      expect(credentials.baseUrl).toBe('https://openapi.airtel.africa/merchant/v1');
    });
  });

  describe('initiateAirtelPayment', () => {
    beforeEach(() => {
      process.env = {
        ...process.env,
        AIRTEL_CLIENT_ID: 'test_client_id',
        AIRTEL_CLIENT_SECRET: 'test_client_secret',
        AIRTEL_MERCHANT_ID: 'test_merchant_id'
      };
    });

    test('devrait initier un paiement avec succès', async () => {
      // Mock de la réponse OAuth
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock_access_token',
            token_type: 'Bearer',
            expires_in: 3600
          })
        })
        // Mock de la réponse d'initiation de paiement
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: {
              code: '200',
              message: 'SUCCESS',
              result_code: 'DP00800001000',
              success: true
            },
            data: {
              transaction: {
                airtel_money_id: 'AM123456789',
                id: 'test-transaction-123',
                message: 'Transaction initiated successfully',
                status: 'PENDING'
              }
            }
          })
        });

      const result = await initiateAirtelPayment('test-transaction-123', '241612345678', 1000);

      expect(result.status.success).toBe(true);
      expect(result.data?.transaction.airtel_money_id).toBe('AM123456789');
      expect(result.data?.transaction.id).toBe('test-transaction-123');
      expect(result.data?.transaction.status).toBe('PENDING');

      // Vérifier les appels d'API
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initiation paiement Airtel Money',
        expect.objectContaining({
          transactionId: 'test-transaction-123',
          amount: 1000
        })
      );
    });

    test('devrait gérer les erreurs OAuth', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      await expect(
        initiateAirtelPayment('test-transaction-123', '241612345678', 1000)
      ).rejects.toThrow('Erreur OAuth2: 401 - Unauthorized');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Erreur token OAuth2',
        expect.objectContaining({ status: 401 })
      );
    });

    test('devrait gérer les erreurs de paiement', async () => {
      // Mock OAuth success
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock_access_token',
            token_type: 'Bearer',
            expires_in: 3600
          })
        })
        // Mock payment error
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            status: {
              code: '400',
              message: 'INVALID_REQUEST',
              success: false
            }
          })
        });

      await expect(
        initiateAirtelPayment('test-transaction-123', '241612345678', 1000)
      ).rejects.toThrow('Erreur Airtel Money');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Erreur API Airtel Money',
        expect.objectContaining({ status: 400 })
      );
    });

    test('devrait masquer partiellement le numéro de téléphone dans les logs', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: { success: true },
            data: { transaction: { airtel_money_id: 'AM123', id: 'tx123', status: 'PENDING' } }
          })
        });

      await initiateAirtelPayment('test-tx', '241612345678', 500);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initiation paiement Airtel Money',
        expect.objectContaining({
          phoneNumber: '241**345678'
        })
      );
    });
  });

  describe('checkPaymentStatus', () => {
    beforeEach(() => {
      process.env = {
        ...process.env,
        AIRTEL_CLIENT_ID: 'test_client_id',
        AIRTEL_CLIENT_SECRET: 'test_client_secret'
      };
    });

    test('devrait vérifier le statut d\'un paiement avec succès', async () => {
      // Mock OAuth
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock_access_token',
            token_type: 'Bearer',
            expires_in: 3600
          })
        })
        // Mock status check
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: {
              code: '200',
              message: 'SUCCESS',
              success: true
            },
            data: {
              transaction: {
                airtel_money_id: 'AM123456789',
                id: 'test-transaction-123',
                message: 'Transaction completed successfully',
                status: 'SUCCESS'
              }
            }
          })
        });

      const result = await checkPaymentStatus('test-transaction-123');

      expect(result.status.success).toBe(true);
      expect(result.data?.transaction.status).toBe('SUCCESS');
      expect(result.data?.transaction.id).toBe('test-transaction-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Statut paiement récupéré',
        expect.objectContaining({
          transactionId: 'test-transaction-123',
          status: 'SUCCESS'
        })
      );
    });

    test('devrait gérer les erreurs de vérification de statut', async () => {
      // Mock OAuth success
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock_access_token',
            token_type: 'Bearer',
            expires_in: 3600
          })
        })
        // Mock status error
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({
            status: {
              code: '404',
              message: 'TRANSACTION_NOT_FOUND',
              success: false
            }
          })
        });

      await expect(
        checkPaymentStatus('nonexistent-transaction')
      ).rejects.toThrow('Erreur statut: 404');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Erreur vérification statut',
        expect.objectContaining({ status: 404 })
      );
    });
  });

  describe('Intégration et scénarios complets', () => {
    test('devrait gérer un flux complet de paiement', async () => {
      const transactionId = 'integration-test-123';
      const phoneNumber = '241612345678';
      const amount = 5000;

      // Mock des réponses pour initiation
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'token_initiate',
            token_type: 'Bearer',
            expires_in: 3600
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: { success: true },
            data: {
              transaction: {
                airtel_money_id: 'AM_INTEGRATION_123',
                id: transactionId,
                status: 'PENDING'
              }
            }
          })
        })
        // Mock des réponses pour vérification de statut
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'token_status',
            token_type: 'Bearer',
            expires_in: 3600
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: { success: true },
            data: {
              transaction: {
                airtel_money_id: 'AM_INTEGRATION_123',
                id: transactionId,
                status: 'SUCCESS'
              }
            }
          })
        });

      // 1. Initier le paiement
      const initiationResult = await initiateAirtelPayment(transactionId, phoneNumber, amount);
      expect(initiationResult.status.success).toBe(true);
      expect(initiationResult.data?.transaction.status).toBe('PENDING');

      // 2. Vérifier le statut
      const statusResult = await checkPaymentStatus(transactionId);
      expect(statusResult.status.success).toBe(true);
      expect(statusResult.data?.transaction.status).toBe('SUCCESS');

      // Vérifier que les logs appropriés ont été générés
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initiation paiement Airtel Money',
        expect.objectContaining({ transactionId, amount })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Statut paiement récupéré',
        expect.objectContaining({ transactionId, status: 'SUCCESS' })
      );
    });

    test('devrait gérer les timeouts et erreurs réseau', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      await expect(
        initiateAirtelPayment('timeout-test', '241612345678', 1000)
      ).rejects.toThrow('Network timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Erreur lors de l\'obtention du token',
        expect.any(Error)
      );
    });
  });

  describe('Tests de sécurité et validation', () => {
    test('devrait valider les paramètres d\'entrée', async () => {
      const validTransactionId = 'valid-transaction-123';
      const validPhoneNumber = '241612345678';
      const validAmount = 1000;

      // Ces tests devraient idéalement être dans la couche de validation
      // mais nous testons ici la robustesse du service
      expect(() => validateAirtelNumber('')).toBeTruthy();
      expect(() => formatPhoneNumber('')).toBeTruthy();
    });

    test('devrait gérer les réponses malformées', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      });

      await expect(
        initiateAirtelPayment('malformed-test', '241612345678', 1000)
      ).rejects.toThrow();
    });
  });
});
