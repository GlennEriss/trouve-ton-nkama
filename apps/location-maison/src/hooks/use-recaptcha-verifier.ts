'use client'

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/firebase/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('hooks.use-recaptcha-verifier');

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
              logger.info('Recaptcha solved');
            },
            'expired-callback': () => {
              logger.info('Recaptcha expired');
            }
          }
        );

        // Rendre le RecaptchaVerifier pour l'initialiser
        if (recaptchaVerifierRef.current) {
        await recaptchaVerifierRef.current.render();
        }
        
        setIsReady(true);
        setError(null);
        logger.info('Recaptcha verifier initialized successfully');
      } catch (err: any) {
        logger.error('Recaptcha verifier initialization failed', { err });
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
          logger.warn('Recaptcha verifier cleanup failed', { err });
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
