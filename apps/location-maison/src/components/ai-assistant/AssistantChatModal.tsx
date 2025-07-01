'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Send, CreditCard, Sparkles, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import useAIAssistant from '@/hooks/useAIAssistant';
import ChatMessage, { Message } from './ChatMessage';
import SmartSuggestions from './SmartSuggestions';
import AutoFillModal from './AutoFillModal';
import usePropertyType from '@/hooks/usePropertyType';
import AIPromptsService from '@/services/ai-prompts.service';

interface AssistantChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  formContext?: any;
}

// Messages de bienvenue prédéfinis
const WELCOME_MESSAGES = [
  "👋 Bonjour ! Je suis votre assistant immobilier IA.",
  "Je peux vous aider à remplir votre formulaire de propriété.",
  "Posez-moi vos questions ou demandez-moi d'analyser votre formulaire actuel !"
];

// Fonction pour sauvegarder les données dans le localStorage
const saveFormDataToLocalStorage = (data: any) => {
  try {
    const savedData = JSON.parse(localStorage.getItem('property_form_draft') ?? '{}');
    const updatedData = { ...savedData, ...data };
    localStorage.setItem('property_form_draft', JSON.stringify(updatedData));
    console.log('Données sauvegardées:', updatedData);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde dans localStorage:', error);
  }
};

// Fonction pour lire les données du localStorage
const getFromLocalStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('property_form_draft') ?? '{}');
  } catch (error) {
    console.error('Erreur lors de la lecture du localStorage:', error);
    return {};
  }
};

// Générateur d'ID unique pour les messages
const generateMessageId = () => {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Fonction utilitaire pour créer un message
const createMessage = (
  type: 'user' | 'assistant' | 'system' | 'error',
  content: string,
  options?: {
    creditsUsed?: number;
    creditsRemaining?: number;
  }
): Message => ({
  id: generateMessageId(),
  type,
  content,
  timestamp: new Date(),
  ...(options?.creditsUsed && { creditsUsed: options.creditsUsed }),
  ...(options?.creditsRemaining !== undefined && { creditsRemaining: options.creditsRemaining })
});

// Fonction utilitaire pour gérer les réponses de l'IA
const handleAIResponse = (
  result: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  if (result.success) {
    const assistantMessage = createMessage('assistant', result.response ?? '', {
      creditsUsed: 1,
      creditsRemaining: result.creditsRemaining
    });
    setMessages(prev => [...prev, assistantMessage]);
    return true;
  } else {
    const errorMessage = createMessage('error', result.error ?? 'Une erreur est survenue');
    setMessages(prev => [...prev, errorMessage]);
    return false;
  }
};

// Fonction utilitaire pour gérer les erreurs de try/catch
const handleTryCatchError = (
  error: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  customMessage?: string
) => {
  console.error('Erreur:', error);
  const errorMessage = createMessage('error', customMessage ?? 'Erreur inattendue');
  setMessages(prev => [...prev, errorMessage]);
};

const AssistantChatModal: React.FC<AssistantChatModalProps> = ({
  isOpen,
  onClose,
  formContext
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const { sendMessage, creditsAvailable, isLoading } = useAIAssistant();
  const { propertyType, propertyLabel, requiredFields } = usePropertyType();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus automatique sur l'input quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialisation des messages de bienvenue
  useEffect(() => {
    if (isOpen && !isInitialized) {
      const welcomeMessages: Message[] = WELCOME_MESSAGES.map((content, index) => 
        createMessage('system', content)
      );
      
      setMessages(welcomeMessages);
      setIsInitialized(true);
    }
  }, [isOpen, isInitialized]);

  // Envoyer un message à l'IA
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = createMessage('user', inputValue.trim());
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = inputValue.trim();
    setInputValue('');

    // Préparer le contexte avec les données du formulaire
    const currentFormData = getFromLocalStorage();
    const contextData = {
      ...formContext,
      currentFormData,
      currentStep: formContext?.activeStep ?? 0,
      availableCredits: creditsAvailable
    };

    try {
      const result = await sendMessage(currentInput, contextData);
      const success = handleAIResponse(result, setMessages);

      if (success) {
        // Analyser la réponse pour des suggestions de remplissage automatique
        await handleAutoFillSuggestions(result.response ?? '', currentFormData);
      }
    } catch (error) {
      handleTryCatchError(error, setMessages, 'Erreur inattendue lors de la communication avec l\'assistant');
    }
  };

  // Analyser les réponses de l'IA pour des suggestions de remplissage
  const handleAutoFillSuggestions = async (response: string, currentData: any) => {
    // Exemple simple : si l'IA mentionne "superficie: X m²", on peut l'extraire
    const areaRegex = /superficie[:\s]*(\d+)\s*m²/i;
    const areaMatch = areaRegex.exec(response);
    if (areaMatch && !currentData.area) {
      const suggestedArea = parseInt(areaMatch[1]);
      
      const suggestionMessage = createMessage(
        'system', 
        `💡 Suggestion détectée : Souhaitez-vous définir la superficie à ${suggestedArea} m² ?`
      );
      
      setMessages(prev => [...prev, suggestionMessage]);
    }
  };

  // Gestion de l'envoi avec Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Analyser le formulaire actuel
  const handleAnalyzeForm = async () => {
    const currentData = getFromLocalStorage();
    const analysisPrompt = `Analyse les données actuelles du formulaire : ${JSON.stringify(currentData)}. Donne-moi des suggestions d'amélioration et identifie les champs manquants importants.`;
    
    const userMessage = createMessage('user', '📊 Analyser mon formulaire actuel');
    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await sendMessage(analysisPrompt, formContext);
      handleAIResponse(result, setMessages);
    } catch (error) {
      handleTryCatchError(error, setMessages);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    // Vérifier si c'est une demande de génération automatique
    if (suggestion.startsWith('AUTO_FILL_PROPERTY:')) {
      setShowAutoFillModal(true);
      return;
    }
    
    if (suggestion === "Analyser mon formulaire") {
      handleAnalyzeForm();
    } else {
      setInputValue(suggestion);
    }
  };

  // Gérer la génération automatique
  const handleAutoFillProperty = async (description: string) => {
    if (!description.trim() || !propertyType || !propertyLabel) return;

    setShowAutoFillModal(false);

    const userMessage = createMessage(
      'user', 
      `🪄 Génération automatique pour ${propertyLabel}: "${description}"`
    );
    setMessages(prev => [...prev, userMessage]);

    try {
      const prompt = AIPromptsService.getAutoFillPrompt(
        propertyType,
        propertyLabel,
        requiredFields,
        description.trim()
      );

      const result = await sendMessage(prompt, formContext);

      if (result.success && result.response) {
        await processAutoFillResponse(result);
      } else {
        handleAIResponse(result, setMessages);
      }
    } catch (error) {
      handleTryCatchError(error, setMessages, 'Erreur inattendue lors de la génération automatique');
    }
  };

  // Traiter la réponse de génération automatique
  const processAutoFillResponse = async (result: any) => {
    try {
      const cleanedResponse = result.response?.replace(/```json\n?|\n?```/g, '').trim() ?? '';
      const generatedData = JSON.parse(cleanedResponse);

      // Sauvegarder dans localStorage
      const formData = {
        title: generatedData.title,
        description: generatedData.description,
        area: generatedData.area,
        price: generatedData.price,
        tags: generatedData.tags,
        status: 'FOR_RENT',
        ...generatedData.propertyDetails
      };

      saveFormDataToLocalStorage(formData);

      // Message de succès avec résumé
      const successContent = createAutoFillSuccessMessage(generatedData);
      const successMessage = createMessage('assistant', successContent, {
        creditsUsed: 1,
        creditsRemaining: result.creditsRemaining
      });

      setMessages(prev => [...prev, successMessage]);

      // Rafraîchir la page pour afficher les nouvelles données
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      const errorMessage = createMessage(
        'error',
        `Erreur lors de l'analyse de la réponse de l'IA. Réponse reçue: ${result.response ?? ''}`
      );
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Créer le message de succès pour la génération automatique
  const createAutoFillSuccessMessage = (generatedData: any) => {
    return `✅ **Formulaire généré avec succès !**

**Titre :** ${generatedData.title}

**Description :** ${generatedData.description.substring(0, 100)}...

**Détails :**
- Superficie : ${generatedData.area} m²
- Prix : ${generatedData.price.toLocaleString()} €
- Tags : ${generatedData.tags.join(', ')}

**Confiance :** ${generatedData.confidence}%

**Suggestions :**
${generatedData.suggestions?.map((s: string) => `• ${s}`).join('\n') ?? ''}

📝 *Le formulaire a été automatiquement rempli ! Vous pouvez maintenant le réviser et l'ajuster selon vos besoins.*`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] md:max-h-[80vh] p-0 gap-0 flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" style={{ color: '#156B66' }} />
                <span>Assistant IA Immobilier</span>
              </DialogTitle>
              <div className="flex items-center space-x-2 mr-5">
                <Badge variant="outline" className="flex items-center space-x-1">
                  <CreditCard className="w-3 h-3" />
                  <span>{creditsAvailable} crédits</span>
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4 min-h-0">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {/* Indicateur de chargement */}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 rounded-2xl px-4 py-2 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#156B66' }} />
                      <span className="text-sm text-gray-600">L'assistant réfléchit...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Suggestions intelligentes */}
          {messages.length <= WELCOME_MESSAGES.length && (
            <div className="flex-shrink-0">
              <SmartSuggestions
                activeStep={formContext?.activeStep}
                formData={getFromLocalStorage()}
                onSuggestionClick={handleQuickSuggestion}
                disabled={creditsAvailable <= 0}
              />
            </div>
          )}

          {/* Zone de saisie */}
          <div className="px-6 py-4 border-t bg-white flex-shrink-0">
            {creditsAvailable > 0 ? (
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Posez votre question..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                  className="px-3"
                  style={{ backgroundColor: '#156B66' }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-700 text-sm mb-2">
                  Vous n'avez plus de crédits pour utiliser l'assistant IA
                </p>
                <Button variant="outline" size="sm">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Recharger des crédits
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de génération automatique séparé */}
      <AutoFillModal
        isOpen={showAutoFillModal}
        onClose={() => setShowAutoFillModal(false)}
        propertyLabel={propertyLabel ?? 'propriété'}
        requiredFields={requiredFields}
        onGenerate={handleAutoFillProperty}
        creditsAvailable={creditsAvailable}
        isLoading={isLoading}
      />
    </>
  );
};

export default AssistantChatModal; 