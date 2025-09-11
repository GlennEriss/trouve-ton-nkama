import AIFormService from '@/services/ai-form.service';

/**
 * Factory pour créer et gérer l'instance singleton du service AIFormService
 * Utilise le pattern Singleton pour s'assurer qu'une seule instance existe
 */
class AIFormServiceFactory {
    private static instance: AIFormService | null = null;

    /**
     * Obtient l'instance singleton du service AIFormService
     * @returns L'instance unique du service
     */
    public static getInstance(): AIFormService {
        if (!AIFormServiceFactory.instance) {
            AIFormServiceFactory.instance = new AIFormService();
        }
        return AIFormServiceFactory.instance;
    }

    /**
     * Crée une nouvelle instance du service (pour les tests ou cas spéciaux)
     * @returns Une nouvelle instance du service
     */
    public static createNewInstance(): AIFormService {
        return new AIFormService();
    }

    /**
     * Réinitialise l'instance singleton (utile pour les tests)
     */
    public static resetInstance(): void {
        AIFormServiceFactory.instance = null;
    }

    /**
     * Vérifie si une instance existe déjà
     * @returns true si une instance existe, false sinon
     */
    public static hasInstance(): boolean {
        return AIFormServiceFactory.instance !== null;
    }
}

export default AIFormServiceFactory;
