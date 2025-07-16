'use client'

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/firebase/auth';

export const useRecaptchaVerifier = (containerId: string) => {
  const recaptchaVerifierRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const initializeRecaptcha = async () => {
      try {
        // Vérifier que Firebase est initialisé
        if (!auth) {
          throw new Error('Firebase Auth non initialisé');
        }

        // Importer RecaptchaVerifier dynamiquement
        const { RecaptchaVerifier } = await import('firebase/auth');

        // S'assurer que le container existe dans le DOM
        if (!document.getElementById(containerId)) {
          const recaptchaDiv = document.createElement('div');
          recaptchaDiv.id = containerId;
          recaptchaDiv.style.display = 'none';
          document.body.appendChild(recaptchaDiv);
        }

        // Attendre un peu pour s'assurer que Firebase est complètement initialisé
        await new Promise(resolve => setTimeout(resolve, 100));

        // Créer le RecaptchaVerifier avec la signature correcte pour Firebase v11
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth,
          containerId,
          {
            size: 'invisible',
            callback: () => {
              console.log('Recaptcha résolu');
            },
            'expired-callback': () => {
              console.log('Recaptcha expiré');
            }
          }
        );

        // Rendre le RecaptchaVerifier pour l'initialiser
        if (recaptchaVerifierRef.current) {
        await recaptchaVerifierRef.current.render();
        }
        
        setIsReady(true);
        setError(null);
        console.log('RecaptchaVerifier initialisé avec succès');
      } catch (err: any) {
        console.error('Erreur création RecaptchaVerifier:', err);
        setError(err.message || 'Erreur lors de l\'initialisation du RecaptchaVerifier');
        setIsReady(false);
      }
    };

    initializeRecaptcha();

    // Cleanup
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (err) {
          console.log('Erreur nettoyage RecaptchaVerifier:', err);
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, [containerId]);

  return {
    recaptchaVerifier: recaptchaVerifierRef.current,
    isReady,
    error
  };
}; 