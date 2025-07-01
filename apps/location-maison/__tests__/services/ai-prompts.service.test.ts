import { describe, test, expect } from '@jest/globals';
import { AIPromptsService, FormContext } from '@/services/ai-prompts.service';

describe('AI Prompts Service Tests', () => {
  describe('getSystemPrompt', () => {
    test('devrait retourner le prompt système complet', () => {
      const systemPrompt = AIPromptsService.getSystemPrompt();

      expect(systemPrompt).toContain('assistant immobilier français');
      expect(systemPrompt).toContain('CONTEXTE:');
      expect(systemPrompt).toContain('CAPACITÉS:');
      expect(systemPrompt).toContain('RÈGLES:');
      expect(systemPrompt).toContain('STYLE:');
      expect(systemPrompt).toContain('maisons, appartements, studios, villas, bureaux');
      expect(systemPrompt).toContain('1 crédit');
      expect(systemPrompt).toContain('français');
      expect(systemPrompt.length).toBeGreaterThan(500);
    });

    test('devrait contenir les éléments essentiels du système', () => {
      const prompt = AIPromptsService.getSystemPrompt();

      // Vérifier les capacités principales
      expect(prompt).toMatch(/améliorer.*descriptions/i);
      expect(prompt).toMatch(/suggérer.*prix/i);
      expect(prompt).toMatch(/recommander.*tags/i);
      expect(prompt).toMatch(/informations manquantes/i);
      
      // Vérifier les règles importantes
      expect(prompt).toMatch(/réponds.*français/i);
      expect(prompt).toMatch(/professionnel.*bienveillant/i);
      expect(prompt).toMatch(/conseils pratiques/i);
    });
  });

  describe('getFormAnalysisPrompt', () => {
    test('devrait générer un prompt d\'analyse de formulaire', () => {
      const formData = {
        title: 'Belle maison',
        price: 150000,
        area: 120,
        description: 'Maison spacieuse'
      };

      const context: FormContext = {
        activeStep: 1,
        totalSteps: 4,
        factoryType: 'house'
      };

      const prompt = AIPromptsService.getFormAnalysisPrompt(formData, context);

      expect(prompt).toContain('ANALYSE DU FORMULAIRE DEMANDÉE');
      expect(prompt).toContain('Étape actuelle: Détails de la propriété (2/4)');
      expect(prompt).toContain('Type de propriété: house');
      expect(prompt).toContain('Belle maison');
      expect(prompt).toContain('150000');
      expect(prompt).toContain('120');
      expect(prompt).toContain('✅ Points forts actuels');
      expect(prompt).toContain('⚠️ Points à améliorer');
      expect(prompt).toContain('📝 Suggestions d\'amélioration');
      expect(prompt).toContain('🎯 Recommandations pour la suite');
    });

    test('devrait gérer le contexte optionnel', () => {
      const formData = { title: 'Test' };
      const prompt = AIPromptsService.getFormAnalysisPrompt(formData);

      expect(prompt).toContain('Étape actuelle: Inconnu (?/4)');
      expect(prompt).toContain('Type de propriété: Non spécifié');
      expect(prompt).toContain('Test');
    });
  });

  describe('Validation générale', () => {
    test('tous les prompts devraient être des chaînes non vides', () => {
      const prompts = [
        AIPromptsService.getSystemPrompt(),
        AIPromptsService.getFormAnalysisPrompt({}),
        AIPromptsService.getTagSuggestionPrompt({}),
        AIPromptsService.getDescriptionImprovementPrompt('test', {}),
        AIPromptsService.getPriceEstimationPrompt({}),
        AIPromptsService.getLocationAdvicePrompt({}),
        AIPromptsService.getAutoFillPrompt('House', 'Maison', [], 'test'),
        AIPromptsService.buildContextualPrompt('test', {})
      ];

      prompts.forEach((prompt) => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });
  });
});
