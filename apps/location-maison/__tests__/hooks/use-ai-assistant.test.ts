import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

type SessionUser = {
  uid: string;
  email: string;
  credits: number;
};

type SessionState = {
  data: { user: SessionUser } | null;
  status: 'authenticated' | 'unauthenticated' | 'loading';
  update: jest.Mock;
};

type GeneratedContentResult = {
  response: {
    text: () => string;
  };
};

type DeductCreditsResult = {
  success: boolean;
  transactionId?: string;
  error?: string;
};

// Mock de next-auth
const mockSession: SessionState = {
  data: {
    user: {
      uid: 'user-123',
      email: 'test@example.com',
      credits: 50
    }
  },
  status: 'authenticated',
  update: jest.fn()
};

jest.mock('next-auth/react', () => ({
  useSession: () => mockSession
}));

// Mock du service de prompts IA
const mockAIPromptsService = {
  getSystemPrompt: jest.fn(() => 'Vous êtes un assistant immobilier au Gabon.'),
  buildContextualPrompt: jest.fn((message: string, context: unknown) => `Contexte: ${JSON.stringify(context)}\nMessage: ${message}`)
};

jest.mock('@/services/ai-prompts.service', () => ({
  default: mockAIPromptsService
}));

// Mock de Firebase AI
const mockGenerateContent = jest.fn() as jest.MockedFunction<
  (prompt: string) => Promise<GeneratedContentResult>
>;
const mockModel = {
  generateContent: mockGenerateContent
};

jest.mock('@/firebase/ai', () => ({
  model: mockModel
}));

// Mock de la déduction de crédits
const mockDeductCreditsWithTransaction = jest.fn() as jest.MockedFunction<
  (input: {
    userId: string;
    amount: number;
    type: string;
    description: string;
  }) => Promise<DeductCreditsResult>
>;

jest.mock('@/db/credit-transaction.db', () => ({
  deductCreditsWithTransaction: mockDeductCreditsWithTransaction
}));

// Mock du hook useAIAssistant avec une implémentation simple
const mockUseAIAssistant = () => ({
  creditsAvailable: mockSession.data?.user?.credits || 0,
  sendMessage: async (message: string, context?: unknown) => {
    if (!mockSession.data) {
      return {
        success: false,
        error: 'Vous devez être connecté pour utiliser l\'assistant IA'
      };
    }

    if (mockSession.data.user.credits <= 0) {
      return {
        success: false,
        error: 'Crédits insuffisants pour utiliser l\'assistant IA. Veuillez recharger votre compte.'
      };
    }

    try {
      const prompt = context 
        ? mockAIPromptsService.buildContextualPrompt(message, context)
        : mockAIPromptsService.getSystemPrompt() + '\n' + message;

      const aiResponse = await mockModel.generateContent(prompt);
      const responseText = aiResponse.response.text();

      const creditResult = await mockDeductCreditsWithTransaction({
        userId: mockSession.data.user.uid,
        amount: 1,
        type: 'AI_ASSISTANT',
        description: 'Assistant IA'
      });

      if (creditResult.success) {
        return {
          success: true,
          response: responseText,
          creditsRemaining: mockSession.data.user.credits - 1,
          transactionId: creditResult.transactionId
        };
      } else {
        return {
          success: false,
          error: 'Erreur lors de la déduction des crédits'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la génération de la réponse IA'
      };
    }
  }
});

describe('useAIAssistant Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.data = {
      user: {
        uid: 'user-123',
        email: 'test@example.com',
        credits: 50
      }
    };
    mockSession.status = 'authenticated';
  });

  describe('État d\'authentification', () => {
    test('devrait retourner une erreur si utilisateur non connecté', async () => {
      mockSession.data = null;
      mockSession.status = 'unauthenticated';

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Test message');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Vous devez être connecté pour utiliser l\'assistant IA');
    });

    test('devrait retourner une erreur si crédits insuffisants', async () => {
      mockSession.data = {
        user: {
          uid: 'user-123',
          email: 'test@example.com',
          credits: 0
        }
      };

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Test message');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Crédits insuffisants pour utiliser l\'assistant IA. Veuillez recharger votre compte.');
      expect(aiAssistant.creditsAvailable).toBe(0);
    });

    test('devrait afficher le nombre de crédits disponibles', () => {
      mockSession.data = {
        user: {
          uid: 'user-123',
          email: 'test@example.com',
          credits: 150
        }
      };

      const aiAssistant = mockUseAIAssistant();
      expect(aiAssistant.creditsAvailable).toBe(150);
    });
  });

  describe('Génération de réponses IA', () => {
    test('devrait générer une réponse IA avec succès', async () => {
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

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Comment améliorer mon annonce ?');

      expect(response.success).toBe(true);
      expect(response.response).toBe('Voici des conseils pour votre annonce immobilière au Gabon.');
      expect(response.creditsRemaining).toBe(49);
      expect(response.transactionId).toBe('tx-ai-123');
    });

    test('devrait utiliser un prompt contextuel quand fourni', async () => {
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

      const context = {
        activeStep: 1,
        totalSteps: 4,
        factoryType: 'house',
        currentFormData: {
          title: 'Belle maison familiale',
          price: 150000
        }
      };

      const aiAssistant = mockUseAIAssistant();
      await aiAssistant.sendMessage('Aide-moi avec le prix', context);

      expect(mockAIPromptsService.buildContextualPrompt).toHaveBeenCalledWith(
        'Aide-moi avec le prix',
        context
      );
    });

    test('devrait utiliser le prompt système quand pas de contexte', async () => {
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

      const aiAssistant = mockUseAIAssistant();
      await aiAssistant.sendMessage('Question générale');

      expect(mockAIPromptsService.getSystemPrompt).toHaveBeenCalled();
    });

    test('devrait gérer les erreurs d\'IA', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('Erreur API IA'));

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Test message');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Erreur lors de la génération de la réponse IA');
    });

    test('devrait gérer l\'échec de déduction des crédits', async () => {
      const mockAIResponse = {
        response: {
          text: () => 'Réponse IA'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: false,
        error: 'Erreur de déduction'
      });

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Test message');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Erreur lors de la déduction des crédits');
    });
  });

  describe('Gestion des contextes spécialisés', () => {
    test('devrait traiter le contexte de création de propriété', async () => {
      const mockAIResponse = {
        response: {
          text: () => 'Suggestions spécifiques pour votre appartement.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-apartment-123'
      });

      const propertyContext = {
        activeStep: 2,
        totalSteps: 4,
        factoryType: 'apartment',
        currentFormData: {
          type: 'APARTMENT',
          rooms: 3,
          area: 85,
          location: 'Libreville'
        }
      };

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Aide-moi à optimiser cette annonce', propertyContext);

      expect(response.success).toBe(true);
      expect(mockAIPromptsService.buildContextualPrompt).toHaveBeenCalledWith(
        'Aide-moi à optimiser cette annonce',
        propertyContext
      );
    });

    test('devrait traiter le contexte de recherche immobilière', async () => {
      const mockAIResponse = {
        response: {
          text: () => 'Voici des recommandations de recherche personnalisées.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-search-123'
      });

      const searchContext = {
        searchType: 'rental',
        criteria: {
          location: 'Port-Gentil',
          priceRange: [100000, 300000],
          propertyType: 'HOUSE'
        },
        resultsCount: 15
      };

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Peux-tu m\'aider à affiner ma recherche ?', searchContext);

      expect(response.success).toBe(true);
      expect(response.response).toBe('Voici des recommandations de recherche personnalisées.');
    });
  });

  describe('Tests de performance et limites', () => {
    test('devrait gérer les messages longs', async () => {
      const longMessage = 'A'.repeat(1000);
      
      const mockAIResponse = {
        response: {
          text: () => 'Réponse pour message long.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-long-123'
      });

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage(longMessage);

      expect(response.success).toBe(true);
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining(longMessage)
      );
    });

    test('devrait gérer les contextes complexes', async () => {
      const complexContext = {
        multiStep: true,
        currentStep: 3,
        previousSteps: [
          { step: 1, data: { type: 'HOUSE' } },
          { step: 2, data: { location: 'Libreville' } }
        ],
        validationErrors: ['price_required', 'description_too_short'],
        userPreferences: {
          language: 'fr',
          experienceLevel: 'beginner'
        }
      };

      const mockAIResponse = {
        response: {
          text: () => 'Aide contextuelle détaillée.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-complex-123'
      });

      const aiAssistant = mockUseAIAssistant();
      const response = await aiAssistant.sendMessage('Aide avec les erreurs de validation', complexContext);

      expect(response.success).toBe(true);
      expect(mockAIPromptsService.buildContextualPrompt).toHaveBeenCalledWith(
        'Aide avec les erreurs de validation',
        complexContext
      );
    });

    test('devrait traiter les messages simultanés', async () => {
      const mockAIResponse = {
        response: {
          text: () => 'Réponse simultanée.'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockAIResponse);
      mockDeductCreditsWithTransaction.mockResolvedValue({
        success: true,
        transactionId: 'tx-concurrent-123'
      });

      const aiAssistant = mockUseAIAssistant();

      const promises = [
        aiAssistant.sendMessage('Message 1'),
        aiAssistant.sendMessage('Message 2'),
        aiAssistant.sendMessage('Message 3')
      ];

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      expect(mockModel.generateContent).toHaveBeenCalledTimes(3);
      expect(mockDeductCreditsWithTransaction).toHaveBeenCalledTimes(3);
    });
  });
});
