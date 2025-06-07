'use client'

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { updateUser } from '@/db/user.db';
import { model } from '@/firebase/ai';
import AIPromptsService, { FormContext } from '@/services/ai-prompts.service';

// Types pour les réponses de l'assistant
interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  creditsRemaining?: number;
}

interface AIAssistantHook {
  sendMessage: (message: string, context?: any) => Promise<AIResponse>;
  creditsAvailable: number;
  isLoading: boolean;
}

// Service pour envoyer des messages à l'IA
async function sendToAI(message: string, context?: FormContext): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    // Construction du prompt intelligent avec contexte
    let prompt = message;
    if (context) {
      prompt = AIPromptsService.buildContextualPrompt(message, context);
    } else {
      // Prompt système de base si pas de contexte
      prompt = `${AIPromptsService.getSystemPrompt()}\n\nQUESTION: ${message}\n\nRéponds en français de manière utile:`;
    }

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      success: true,
      text: text
    };
  } catch (error) {
    console.error('Erreur lors de la communication avec l\'IA:', error);
    return {
      success: false,
      error: 'Erreur lors de la communication avec l\'assistant IA'
    };
  }
}

export const useAIAssistant = (): AIAssistantHook => {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, context?: any): Promise<AIResponse> => {
    // Vérifier si l'utilisateur est connecté
    if (!session?.user) {
      return {
        success: false,
        error: "Vous devez être connecté pour utiliser l'assistant IA"
      };
    }

    // Vérifier si l'utilisateur a des crédits
    if (!session.user.credits || session.user.credits <= 0) {
      return {
        success: false,
        error: "Crédits insuffisants pour utiliser l'assistant IA. Veuillez recharger votre compte."
      };
    }

    setIsLoading(true);

    try {
      // Envoyer la requête à l'IA
      const aiResponse = await sendToAI(message, context as FormContext);
      
      // Si la réponse de l'IA a échoué, ne pas déduire de crédit
      if (!aiResponse.success) {
        setIsLoading(false);
        return {
          success: false,
          error: aiResponse.error || "Erreur lors de la génération de la réponse"
        };
      }

      // Calculer les nouveaux crédits
      const newCredits = session.user.credits - 1;
      
      try {
        // Mise à jour de la session
        await update({
          user: {
            ...session.user,
            credits: newCredits
          }
        });
        
        // Mise à jour dans Firebase (en arrière-plan)
        updateUser(session.user.uid, { 
          credits: newCredits 
        }).catch((error) => {
          console.error('Erreur lors de la mise à jour des crédits dans Firebase:', error);
          // Note: On ne bloque pas l'utilisateur même si la mise à jour Firebase échoue
        });
        
        setIsLoading(false);
        
        return {
          success: true,
          response: aiResponse.text,
          creditsRemaining: newCredits
        };
      } catch (sessionError) {
        console.error('Erreur lors de la mise à jour de la session:', sessionError);
        setIsLoading(false);
        
        // Même si la mise à jour de session échoue, on retourne la réponse de l'IA
        // mais on avertit qu'il y a eu un problème avec les crédits
        return {
          success: true,
          response: aiResponse.text,
          error: "Réponse générée mais erreur lors de la déduction des crédits"
        };
      }
    } catch (error) {
      console.error("Erreur générale de l'assistant IA:", error);
      setIsLoading(false);
      
      return {
        success: false,
        error: "Erreur inattendue lors de la communication avec l'assistant"
      };
    }
  };

  return {
    sendMessage,
    creditsAvailable: session?.user?.credits || 0,
    isLoading
  };
};

export default useAIAssistant; 