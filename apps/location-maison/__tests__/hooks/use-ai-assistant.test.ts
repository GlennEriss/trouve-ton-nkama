import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useAIAssistant } from '@/hooks/useAIAssistant';

// Mock de next-auth
const mockUpdate = jest.fn();
jest.mock('next-auth/react');

// Mock du service de prompts IA
const mockAIPromptsService = {
  getSystemPrompt: jest.fn(() => 'Vous êtes un assistant immobilier au Gabon.'),
  buildContextualPrompt: jest.fn((message, context) => `Contexte: ${JSON.stringify(context)}\nMessage: ${message}`)
};

jest.mock('@/services/ai-prompts.service', () => ({
  default: mockAIPromptsService
}));

// Mock de Firebase AI
const mockModel = {
  generateContent: jest.fn()
};

jest.mock('@/firebase/ai', () => ({
  model: mockModel
}));

// Mock de la déduction de crédits
const mockDeductCreditsWithTransaction = jest.fn();

jest.mock('@/db/credit-transaction.db', () => ({
  deductCreditsWithTransaction: mockDeductCreditsWithTransaction
}));

describe('useAIAssistant Hook Tests', () => {
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue(undefined);
  });

  describe('État d\'authentification', () => {
    test('devrait retourner une erreur si utilisateur non connecté', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: mockUpdate
      });

      const { result } = renderHook(() => useAIAssistant());

      const response = await result.current.sendMessage('Test message');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Vous devez être connecté pour utiliser l\'assistant IA');
      expect(result.current.creditsAvailable).toBe(0);
    });

    test('devrait retourner une erreur si crédits insuffisants', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        credits: 0
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const { result } = renderHook(() => useAIAssistant());

      const response = await result.current.sendMessage('Test message');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Crédits insuffisants pour utiliser l\'assistant IA. Veuillez recharger votre compte.');
      expect(result.current.creditsAvailable).toBe(0);
    });

    test('devrait afficher le nombre de crédits disponibles', () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        credits: 150
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const { result } = renderHook(() => useAIAssistant());

      expect(result.current.creditsAvailable).toBe(150);
    });
  });

  describe('Génération de réponses IA', () => {
    test('devrait générer une réponse IA avec succès', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        credits: 50
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const mockAIResponse = {
        response: {
          text: () => 'Voici des conseils pour votre annonce immobilière au Gabon.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-ai-123'
      });

      const { result } = renderHook(() => useAIAssistant());

      let response;
      await act(async () => {
        response = await result.current.sendMessage('Comment améliorer mon annonce ?');
      });

      expect(response?.success).toBe(true);
      expect(response?.response).toBe('Voici des conseils pour votre annonce immobilière au Gabon.');
      expect(response?.creditsRemaining).toBe(49);
      expect(response?.transactionId).toBe('tx-ai-123');
    });

    test('devrait utiliser un prompt contextuel quand fourni', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        credits: 50
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const mockAIResponse = {
        response: {
          text: () => 'Réponse contextuelle pour maison.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-context-123'
      });

      const { result } = renderHook(() => useAIAssistant());

      const context = {
        activeStep: 1,
        totalSteps: 4,
        factoryType: 'house',
        currentFormData: {
          title: 'Belle maison familiale',
          price: 150000
        }
      };

      await act(async () => {
        await result.current.sendMessage('Aide-moi avec le prix', context);
      });

      expect(mockAIPromptsService.buildContextualPrompt).toHaveBeenCalledWith(
        'Aide-moi avec le prix',
        context
      );
    });

    test('devrait utiliser le prompt système quand pas de contexte', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        credits: 50
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const mockAIResponse = {
        response: {
          text: () => 'Réponse générale de l\'assistant.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-system-123'
      });

      const { result } = renderHook(() => useAIAssistant());

      await act(async () => {
        await result.current.sendMessage('Question générale');
      });

      expect(mockAIPromptsService.getSystemPrompt).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('Vous êtes un assistant immobilier au Gabon.')
      );
    });
  });

  describe('Gestion des crédits', () => {
    test('devrait déduire 1 crédit après une réponse réussie', async () => {
      const mockUser = {
        uid: 'user-456',
        email: 'credit-test@example.com',
        credits: 25
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent.mockResolvedValue({
        response: { text: () => 'Réponse IA' }
      });

      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-deduction-456'
      });

      const { result } = renderHook(() => useAIAssistant());

      await act(async () => {
        await result.current.sendMessage('Test de déduction de crédit');
      });

      expect(mockDeductCreditsWithTransaction).toHaveBeenCalledWith(
        'user-456',
        1,
        'Assistant IA',
        undefined,
        'Assistant IA - Question: "Test de déduction de crédit"'
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        user: {
          ...mockUser,
          credits: 24
        }
      });
    });

    test('devrait tronquer les messages longs dans la description', async () => {
      const mockUser = {
        uid: 'user-789',
        email: 'long-message@example.com',
        credits: 10
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent.mockResolvedValue({
        response: { text: () => 'Réponse IA' }
      });

      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-long-789'
      });

      const { result } = renderHook(() => useAIAssistant());

      const longMessage = 'A'.repeat(100); // Message de 100 caractères

      await act(async () => {
        await result.current.sendMessage(longMessage);
      });

      expect(mockDeductCreditsWithTransaction).toHaveBeenCalledWith(
        'user-789',
        1,
        'Assistant IA',
        undefined,
        `Assistant IA - Question: "${longMessage.substring(0, 50)}..."`
      );
    });

    test('devrait gérer les échecs de déduction de crédits', async () => {
      const mockUser = {
        uid: 'user-error',
        email: 'error@example.com',
        credits: 20
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent.mockResolvedValue({
        response: { text: () => 'Réponse IA générée' }
      });

      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: false
      });

      const { result } = renderHook(() => useAIAssistant());

      let response;
      await act(async () => {
        response = await result.current.sendMessage('Test erreur crédit');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Erreur lors de la déduction des crédits');
    });

    test('devrait continuer avec la réponse IA si erreur de transaction', async () => {
      const mockUser = {
        uid: 'user-transaction-error',
        email: 'transaction-error@example.com',
        credits: 15
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent.mockResolvedValue({
        response: { text: () => 'Réponse IA valide' }
      });

      mockDeductCreditsWithTransaction.mockRejectedValue(new Error('Transaction error'));

      const { result } = renderHook(() => useAIAssistant());

      let response;
      await act(async () => {
        response = await result.current.sendMessage('Test erreur transaction');
      });

      expect(response?.success).toBe(true);
      expect(response?.response).toBe('Réponse IA valide');
      expect(response?.error).toContain('Réponse générée mais erreur lors de la déduction des crédits');
    });
  });

  describe('Gestion des erreurs IA', () => {
    test('devrait gérer les erreurs de génération IA', async () => {
      const mockUser = {
        uid: 'user-ia-error',
        email: 'ia-error@example.com',
        credits: 30
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent.mockRejectedValue(new Error('IA service unavailable'));

      const { result } = renderHook(() => useAIAssistant());

      let response;
      await act(async () => {
        response = await result.current.sendMessage('Test erreur IA');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Erreur lors de la communication avec l\'assistant IA');
      
      // Pas de déduction de crédit si l'IA échoue
      expect(mockDeductCreditsWithTransaction).not.toHaveBeenCalled();
    });

    test('devrait gérer les réponses IA malformées', async () => {
      const mockUser = {
        uid: 'user-malformed',
        email: 'malformed@example.com',
        credits: 40
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      // Réponse malformée sans méthode text()
      mockModel.generateContent.mockResolvedValue({
        response: {}
      });

      const { result } = renderHook(() => useAIAssistant());

      let response;
      await act(async () => {
        response = await result.current.sendMessage('Test réponse malformée');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBeTruthy();
      expect(mockDeductCreditsWithTransaction).not.toHaveBeenCalled();
    });

    test('devrait gérer les erreurs générales inattendues', async () => {
      const mockUser = {
        uid: 'user-unexpected',
        email: 'unexpected@example.com',
        credits: 35
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      // Erreur inattendue pendant l'exécution
      mockModel.generateContent.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { result } = renderHook(() => useAIAssistant());

      let response;
      await act(async () => {
        response = await result.current.sendMessage('Test erreur inattendue');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Erreur inattendue lors de la communication avec l\'assistant');
    });
  });

  describe('États de chargement', () => {
    test('devrait indiquer l\'état de chargement pendant le traitement', async () => {
      const mockUser = {
        uid: 'user-loading',
        email: 'loading@example.com',
        credits: 45
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      // Simuler une réponse lente
      mockModel.generateContent.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            response: { text: () => 'Réponse après délai' }
          }), 100)
        )
      );

      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-loading'
      });

      const { result } = renderHook(() => useAIAssistant());

      expect(result.current.isLoading).toBe(false);

      let responsePromise;
      act(() => {
        responsePromise = result.current.sendMessage('Test chargement');
      });

      // Vérifier l'état de chargement
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await responsePromise;
      });

      // Le chargement devrait être terminé
      expect(result.current.isLoading).toBe(false);
    });

    test('devrait arrêter le chargement en cas d\'erreur', async () => {
      const mockUser = {
        uid: 'user-loading-error',
        email: 'loading-error@example.com',
        credits: 25
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent.mockRejectedValue(new Error('IA error'));

      const { result } = renderHook(() => useAIAssistant());

      let responsePromise;
      act(() => {
        responsePromise = result.current.sendMessage('Test erreur chargement');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await responsePromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Intégration et flux complets', () => {
    test('devrait gérer un flux complet réussi', async () => {
      const mockUser = {
        uid: 'integration-user',
        email: 'integration@example.com',
        name: 'Integration User',
        credits: 100
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const mockAIResponse = {
        response: {
          text: () => 'Pour améliorer votre annonce au Gabon, je recommande d\'ajouter des photos de qualité et une description détaillée du quartier.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-integration-success'
      });

      const { result } = renderHook(() => useAIAssistant());

      // Vérifier l'état initial
      expect(result.current.creditsAvailable).toBe(100);
      expect(result.current.isLoading).toBe(false);

      // Envoyer un message avec contexte
      const context = {
        activeStep: 2,
        totalSteps: 4,
        factoryType: 'apartment',
        currentFormData: {
          title: 'Appartement moderne Libreville',
          description: 'Bel appartement en centre-ville',
          price: 85000,
          area: 75
        }
      };

      let response;
      await act(async () => {
        response = await result.current.sendMessage(
          'Comment puis-je rendre cette annonce plus attractive ?',
          context
        );
      });

      // Vérifier la réponse
      expect(response?.success).toBe(true);
      expect(response?.response).toContain('améliorer votre annonce au Gabon');
      expect(response?.creditsRemaining).toBe(99);
      expect(response?.transactionId).toBe('tx-integration-success');

      // Vérifier que les crédits ont été mis à jour
      expect(mockUpdate).toHaveBeenCalledWith({
        user: {
          ...mockUser,
          credits: 99
        }
      });

      // Vérifier l'appel à l'IA avec le bon prompt
      expect(mockAIPromptsService.buildContextualPrompt).toHaveBeenCalledWith(
        'Comment puis-je rendre cette annonce plus attractive ?',
        context
      );

      // Vérifier l'enregistrement de la transaction
      expect(mockDeductCreditsWithTransaction).toHaveBeenCalledWith(
        'integration-user',
        1,
        'Assistant IA',
        undefined,
        'Assistant IA - Question: "Comment puis-je rendre cette annonce plus attractive ?"'
      );
    });

    test('devrait gérer plusieurs messages consécutifs', async () => {
      const mockUser = {
        uid: 'multi-message-user',
        email: 'multi@example.com',
        credits: 50
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Première réponse' }
        })
        .mockResolvedValueOnce({
          response: { text: () => 'Deuxième réponse' }
        });

      mockDeductCreditsWithTransaction
        .mockResolvedValueOnce({
          success: true,
          transactionId: 'tx-1'
        })
        .mockResolvedValueOnce({
          success: true,
          transactionId: 'tx-2'
        });

      const { result } = renderHook(() => useAIAssistant());

      // Premier message
      let response1;
      await act(async () => {
        response1 = await result.current.sendMessage('Premier message');
      });

      expect(response1?.success).toBe(true);
      expect(response1?.creditsRemaining).toBe(49);

      // Deuxième message
      let response2;
      await act(async () => {
        response2 = await result.current.sendMessage('Deuxième message');
      });

      expect(response2?.success).toBe(true);
      expect(response2?.creditsRemaining).toBe(48);

      // Vérifier que les crédits ont été correctement décomptés
      expect(mockDeductCreditsWithTransaction).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cas limites et edge cases', () => {
    test('devrait gérer des crédits exactement à zéro', async () => {
      const mockUser = {
        uid: 'zero-credits',
        email: 'zero@example.com',
        credits: 0
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const { result } = renderHook(() => useAIAssistant());

      const response = await result.current.sendMessage('Test avec zéro crédit');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Crédits insuffisants');
    });

    test('devrait gérer des crédits négatifs', async () => {
      const mockUser = {
        uid: 'negative-credits',
        email: 'negative@example.com',
        credits: -5
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      const { result } = renderHook(() => useAIAssistant());

      expect(result.current.creditsAvailable).toBe(-5);

      const response = await result.current.sendMessage('Test avec crédits négatifs');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Crédits insuffisants');
    });

    test('devrait gérer des messages vides', async () => {
      const mockUser = {
        uid: 'empty-message',
        email: 'empty@example.com',
        credits: 10
      };

      mockUseSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: mockUpdate
      });

      mockModel.generateContent.mockResolvedValue({
        response: { text: () => 'Réponse pour message vide' }
      });

      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-empty'
      });

      const { result } = renderHook(() => useAIAssistant());

      const response = await act(async () => {
        return await result.current.sendMessage('');
      });

      expect(response.success).toBe(true);
      expect(mockDeductCreditsWithTransaction).toHaveBeenCalledWith(
        'empty-message',
        1,
        'Assistant IA',
        undefined,
        'Assistant IA - Question: ""'
      );
    });
  });
});
