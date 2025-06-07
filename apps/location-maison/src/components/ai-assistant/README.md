# Assistant IA Immobilier

## 🎯 Vue d'ensemble

L'assistant IA immobilier est un système intelligent intégré dans l'application location-maison qui aide les utilisateurs à remplir leurs formulaires de propriété de manière optimale.

## 🏗️ Architecture

### Composants principaux

- **`FloatingAssistantButton`** : Bouton flottant fixe avec badge de crédits
- **`AssistantChatModal`** : Interface de chat modal avec l'IA
- **`ChatMessage`** : Composant d'affichage des messages individuels
- **`SmartSuggestions`** : Suggestions contextuelles selon l'étape
- **`CreditNotification`** : Gestion intelligente de l'affichage des crédits

### Services et hooks

- **`useAIAssistant`** : Hook principal pour gérer l'IA et les crédits
- **`AIPromptsService`** : Service de gestion des prompts intelligents

## 🚀 Utilisation

### Intégration basique

```tsx
import { FloatingAssistantButton } from '@/components/ai-assistant';

const MyForm = () => {
  const formContext = {
    activeStep: 1,
    totalSteps: 4,
    currentFormData: {...},
    factoryType: 'HomeFactory'
  };

  return (
    <div>
      {/* Votre formulaire */}
      
      <FloatingAssistantButton formContext={formContext} />
    </div>
  );
};
```

### Utilisation du hook

```tsx
import useAIAssistant from '@/hooks/useAIAssistant';

const MyComponent = () => {
  const { sendMessage, creditsAvailable, isLoading } = useAIAssistant();

  const handleAskAI = async () => {
    const result = await sendMessage("Comment améliorer ma description ?", {
      activeStep: 0,
      currentFormData: {...}
    });

    if (result.success) {
      console.log("Réponse:", result.response);
      console.log("Crédits restants:", result.creditsRemaining);
    }
  };
};
```

## 💳 Système de crédits

### Fonctionnement
- Chaque requête à l'IA coûte **1 crédit**
- Déduction automatique après réponse réussie
- Synchronisation session + Firebase
- Vérification avant chaque requête

### Gestion des erreurs
- Pas de déduction si l'IA échoue
- Gestion gracieuse des erreurs Firebase
- Messages d'erreur contextuels

## 🤖 Prompts intelligents

### Types de prompts disponibles

1. **Système général** : Contexte de base pour toutes les interactions
2. **Analyse de formulaire** : Évaluation complète des données
3. **Suggestions de tags** : Recommandations personnalisées
4. **Amélioration description** : Réécriture optimisée
5. **Estimation prix** : Analyse de marché
6. **Conseils localisation** : Valorisation géographique

### Exemple d'utilisation

```tsx
import AIPromptsService from '@/services/ai-prompts.service';

// Prompt contextualisé
const prompt = AIPromptsService.buildContextualPrompt(
  "Comment améliorer ma propriété ?",
  { activeStep: 1, currentFormData: {...} }
);

// Prompt spécialisé
const analysisPrompt = AIPromptsService.getFormAnalysisPrompt(
  formData,
  { activeStep: 2 }
);
```

## 📱 Interface utilisateur

### Bouton flottant
- Position fixe bottom-right
- Badge de crédits animé
- États visuels selon les crédits
- Tooltips informatifs

### Modal de chat
- Interface moderne et responsive
- Messages typés (user, assistant, system, error)
- Suggestions intelligentes par étape
- Auto-scroll et focus automatique

### Notifications
- Animation sur changement de crédits
- Alertes pour crédits faibles
- États visuels distincts

## 🔧 Configuration

### Variables d'environnement
Le système utilise Firebase AI avec Gemini 2.0-flash.

### localStorage
Les données du formulaire sont sauvegardées dans `property-form-data`.

## 🎨 Personnalisation

### Styling
Tous les composants utilisent Tailwind CSS et les composants UI de l'application.

### Messages de bienvenue
Modifiables dans `AssistantChatModal.tsx` :

```tsx
const WELCOME_MESSAGES = [
  "👋 Bonjour ! Je suis votre assistant immobilier IA.",
  "Je peux vous aider à remplir votre formulaire de propriété.",
  "Posez-moi vos questions ou demandez-moi d'analyser votre formulaire actuel !"
];
```

## 🐛 Dépannage

### Problèmes courants

1. **Import errors** : Vérifiez que tous les fichiers sont bien créés
2. **Firebase AI** : Vérifiez la configuration Firebase
3. **Crédits non mis à jour** : Vérifiez la session utilisateur
4. **Prompts non contextuels** : Vérifiez le passage du formContext

### Logs de débogage
Le système log automatiquement les erreurs dans la console.

## 🚀 Évolutions futures

- Remplissage automatique des champs suggérés
- Historique des conversations
- Export des suggestions
- Intégration avec d'autres services IA
- Analyses prédictives de marché 