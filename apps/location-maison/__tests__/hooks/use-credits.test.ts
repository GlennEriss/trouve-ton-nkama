import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCreditsBalance } from '@/hooks/use-credits-balance';
import { useCreditsPurchase } from '@/hooks/use-credits-purchase';
import { useCreditHistory } from '@/hooks/use-credit-history';

// Mock du hook use-current-user
const mockCurrentUser = {
  user: { uid: 'test-user-123' },
  isLoading: false,
  isFirebaseConnected: true,
  error: null
};

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => mockCurrentUser
}));

// Mock de Firebase Auth
const mockAuth = {
  currentUser: {
    uid: 'test-user-123',
    getIdToken: jest.fn(() => Promise.resolve('mock-firebase-token'))
  }
};

jest.mock('@/firebase/auth', () => ({
  auth: mockAuth
}));

// Mock global fetch
global.fetch = jest.fn();

// Wrapper pour React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: ReactNode }) => {
    const React = require('react');
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('Credits Hooks Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCreditsBalance', () => {
    test('devrait récupérer le solde de crédits avec succès', async () => {
      const mockBalanceResponse = {
        success: true,
        credits: 150,
        message: 'Solde récupéré avec succès'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBalanceResponse)
      } as Response);

      const { result } = renderHook(() => useCreditsBalance(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBalanceResponse);
      expect(mockFetch).toHaveBeenCalledWith('/api/credits/balance', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-firebase-token',
          'Content-Type': 'application/json'
        }
      });
    });

    test('devrait gérer les erreurs de récupération du solde', async () => {
      const mockErrorResponse = {
        message: 'Erreur lors de la récupération du solde'
      };

      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const { result } = renderHook(() => useCreditsBalance(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    test('ne devrait pas faire de requête si utilisateur non connecté', () => {
      mockCurrentUser.user = null as any;
      mockCurrentUser.isFirebaseConnected = false;

      const { result } = renderHook(() => useCreditsBalance(), {
        wrapper: createWrapper()
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFetch).not.toHaveBeenCalled();

      // Restaurer l'état
      mockCurrentUser.user = { uid: 'test-user-123' };
      mockCurrentUser.isFirebaseConnected = true;
    });

    test('devrait gérer les erreurs d\'authentification', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Token invalide' })
      } as Response);

      const { result } = renderHook(() => useCreditsBalance(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Ne devrait pas retry pour les erreurs d'auth
      expect(result.current.failureCount).toBe(1);
    });
  });

  describe('useCreditsPurchase', () => {
    test('devrait acheter des crédits avec succès', async () => {
      const mockPurchaseResponse = {
        success: true,
        transaction: {
          id: 'tx-123',
          amount: 5000,
          credits: 100,
          status: 'PENDING'
        },
        message: 'Achat initié avec succès'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPurchaseResponse)
      } as Response);

      const { result } = renderHook(() => useCreditsPurchase(), {
        wrapper: createWrapper()
      });

      const purchaseData = {
        phoneNumber: '241612345678',
        amount: 5000,
        credits: 100
      };

      result.current.mutate(purchaseData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPurchaseResponse);
      expect(mockFetch).toHaveBeenCalledWith('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-firebase-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(purchaseData)
      });
    });

    test('devrait gérer les erreurs d\'achat', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Numéro de téléphone invalide'
      };

      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse)
      } as Response);

      const { result } = renderHook(() => useCreditsPurchase(), {
        wrapper: createWrapper()
      });

      const purchaseData = {
        phoneNumber: 'invalid-phone',
        amount: 1000,
        credits: 20
      };

      result.current.mutate(purchaseData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    test('devrait valider les données d\'achat', async () => {
      const { result } = renderHook(() => useCreditsPurchase(), {
        wrapper: createWrapper()
      });

      const invalidPurchaseData = {
        phoneNumber: '',
        amount: -100,
        credits: 0
      };

      result.current.mutate(invalidPurchaseData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    test('devrait gérer les différents packs de crédits', async () => {
      const creditPacks = [
        { phoneNumber: '241612345678', amount: 1000, credits: 20 },
        { phoneNumber: '241612345678', amount: 2500, credits: 50 },
        { phoneNumber: '241612345678', amount: 5000, credits: 100 },
        { phoneNumber: '241612345678', amount: 10000, credits: 200 }
      ];

      for (const pack of creditPacks) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            transaction: { id: `tx-${pack.credits}`, ...pack },
            message: 'Achat réussi'
          })
        } as Response);

        const { result } = renderHook(() => useCreditsPurchase(), {
          wrapper: createWrapper()
        });

        result.current.mutate(pack);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.transaction).toMatchObject(pack);
      }
    });
  });

  describe('useCreditHistory', () => {
    test('devrait récupérer l\'historique des crédits', async () => {
      const mockHistoryResponse = {
        success: true,
        transactions: [
          {
            id: 'tx-1',
            type: 'PURCHASE',
            amount: 5000,
            credits: 100,
            description: 'Achat crédits',
            createdAt: { seconds: 1234567890 },
            status: 'SUCCESS'
          },
          {
            id: 'tx-2',
            type: 'DEDUCTION',
            credits: -1,
            description: 'Assistant IA',
            createdAt: { seconds: 1234567800 },
            status: 'SUCCESS'
          }
        ],
        total: 2,
        hasMore: false
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse)
      } as Response);

      const { result } = renderHook(() => useCreditHistory(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHistoryResponse);
      expect(result.current.data?.transactions).toHaveLength(2);
    });

    test('devrait gérer la pagination de l\'historique', async () => {
      const mockPage1 = {
        success: true,
        transactions: Array.from({ length: 10 }, (_, i) => ({
          id: `tx-page1-${i}`,
          type: 'DEDUCTION',
          credits: -1,
          description: `Transaction ${i + 1}`,
          createdAt: { seconds: 1234567890 - i },
          status: 'SUCCESS'
        })),
        hasMore: true,
        nextCursor: 'cursor-page-2'
      };

      const mockPage2 = {
        success: true,
        transactions: Array.from({ length: 5 }, (_, i) => ({
          id: `tx-page2-${i}`,
          type: 'PURCHASE',
          amount: 1000,
          credits: 20,
          description: `Achat ${i + 1}`,
          createdAt: { seconds: 1234567800 - i },
          status: 'SUCCESS'
        })),
        hasMore: false
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage1)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPage2)
        } as Response);

      const { result } = renderHook(() => useCreditHistory(), {
        wrapper: createWrapper()
      });

      // Première page
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.transactions).toHaveLength(10);
      expect(result.current.data?.hasMore).toBe(true);

      // Charger la page suivante
      if (result.current.fetchNextPage) {
        result.current.fetchNextPage();

        await waitFor(() => {
          expect(result.current.data?.transactions).toHaveLength(15);
        });

        expect(result.current.data?.hasMore).toBe(false);
      }
    });

    test('devrait filtrer l\'historique par type', async () => {
      const mockFilteredResponse = {
        success: true,
        transactions: [
          {
            id: 'tx-purchase-1',
            type: 'PURCHASE',
            amount: 5000,
            credits: 100,
            description: 'Achat crédits via Airtel Money',
            createdAt: { seconds: 1234567890 },
            status: 'SUCCESS'
          }
        ],
        total: 1
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFilteredResponse)
      } as Response);

      const { result } = renderHook(() => useCreditHistory({ type: 'PURCHASE' }), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=PURCHASE'),
        expect.any(Object)
      );

      expect(result.current.data?.transactions).toHaveLength(1);
      expect(result.current.data?.transactions[0].type).toBe('PURCHASE');
    });

    test('devrait gérer les erreurs de récupération d\'historique', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Erreur serveur' })
      } as Response);

      const { result } = renderHook(() => useCreditHistory(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Intégration entre les hooks de crédits', () => {
    test('devrait refléter les achats dans le solde et l\'historique', async () => {
      // Mock pour le solde initial
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, credits: 50 })
      } as Response);

      // Mock pour l'achat
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          transaction: { id: 'tx-new', credits: 100 }
        })
      } as Response);

      // Mock pour le nouveau solde
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, credits: 150 })
      } as Response);

      const wrapper = createWrapper();
      
      const { result: balanceResult } = renderHook(() => useCreditsBalance(), { wrapper });
      const { result: purchaseResult } = renderHook(() => useCreditsPurchase(), { wrapper });

      // Vérifier le solde initial
      await waitFor(() => {
        expect(balanceResult.current.data?.credits).toBe(50);
      });

      // Effectuer un achat
      purchaseResult.current.mutate({
        phoneNumber: '241612345678',
        amount: 5000,
        credits: 100
      });

      await waitFor(() => {
        expect(purchaseResult.current.isSuccess).toBe(true);
      });

      // Le solde devrait se mettre à jour automatiquement grâce à l'invalidation
      await waitFor(() => {
        expect(balanceResult.current.data?.credits).toBe(150);
      });
    });

    test('devrait gérer les échecs de synchronisation', async () => {
      // Achat réussi mais échec de mise à jour du solde
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            transaction: { id: 'tx-sync-issue' }
          })
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'));

      const wrapper = createWrapper();
      
      const { result: purchaseResult } = renderHook(() => useCreditsPurchase(), { wrapper });

      purchaseResult.current.mutate({
        phoneNumber: '241612345678',
        amount: 1000,
        credits: 20
      });

      await waitFor(() => {
        expect(purchaseResult.current.isSuccess).toBe(true);
      });

      // L'achat devrait être marqué comme réussi même si la synchronisation échoue
      expect(purchaseResult.current.data?.success).toBe(true);
    });
  });

  describe('Gestion d\'erreurs et cas limites', () => {
    test('devrait gérer les tokens expirés', async () => {
      mockAuth.currentUser.getIdToken.mockRejectedValue(new Error('Token expired'));

      const { result } = renderHook(() => useCreditsBalance(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Token expired');
    });

    test('devrait gérer les erreurs réseau', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useCreditsBalance(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Network timeout');
    });

    test('devrait gérer les réponses malformées', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      } as Response);

      const { result } = renderHook(() => useCreditsBalance(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Performance et cache', () => {
    test('devrait utiliser le cache pour les requêtes répétées', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, credits: 100 })
      } as Response);

      const wrapper = createWrapper();

      // Première requête
      const { unmount: unmount1 } = renderHook(() => useCreditsBalance(), { wrapper });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount1();

      // Deuxième requête - devrait utiliser le cache
      renderHook(() => useCreditsBalance(), { wrapper });

      // Ne devrait pas faire d'appel supplémentaire immédiatement
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('devrait invalider le cache après un achat', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, credits: 50 })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, transaction: { id: 'tx-1' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, credits: 150 })
        } as Response);

      const wrapper = createWrapper();
      
      const { result: balanceResult } = renderHook(() => useCreditsBalance(), { wrapper });
      const { result: purchaseResult } = renderHook(() => useCreditsPurchase(), { wrapper });

      // Attendre le chargement initial
      await waitFor(() => {
        expect(balanceResult.current.isSuccess).toBe(true);
      });

      // Effectuer un achat
      purchaseResult.current.mutate({
        phoneNumber: '241612345678',
        amount: 5000,
        credits: 100
      });

      // Attendre la mise à jour du cache
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });
  });
});
