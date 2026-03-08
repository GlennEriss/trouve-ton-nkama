'use client'

import { useEffect, useRef } from 'react';
import { useCurrentUser } from './use-current-user';
import { createLogger } from '@/lib/logger';

const logger = createLogger('hooks.use-track-property-view');

interface ViewMetadata {
  userId?: string;
  duration?: number;
  scrollDepth?: number;
  imagesViewed?: number[];
  province?: string;
  city?: string;
}

/**
 * Hook pour tracker les vues sur une propriété
 * Utilise sendBeacon pour envoyer les données de manière fiable même lors de la fermeture de la page
 */
export function useTrackPropertyView(propertyId: string | undefined) {
  const { user } = useCurrentUser();
  const startTimeRef = useRef<number | null>(null);
  const scrollDepthRef = useRef<number>(0);
  const imagesViewedRef = useRef<Set<number>>(new Set());
  const hasTrackedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!propertyId) return;

    // Marquer le temps de début
    startTimeRef.current = Date.now();

    // Tracking du scroll
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      if (documentHeight > windowHeight) {
        const percentage = (scrollTop / (documentHeight - windowHeight)) * 100;
        scrollDepthRef.current = Math.max(scrollDepthRef.current, Math.min(percentage, 100));
      } else {
        scrollDepthRef.current = 100; // Page entièrement visible sans scroll
      }
    };

    // Tracking des images via Intersection Observer
    const observeImages = () => {
      const images = document.querySelectorAll('[data-property-image]');
      const observers: IntersectionObserver[] = [];

      images.forEach((img, index) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                imagesViewedRef.current.add(index);
              }
            });
          },
          { threshold: 0.5 }
        );

        observer.observe(img);
        observers.push(observer);
      });

      // Nettoyer les observers au démontage
      return () => {
        observers.forEach((obs) => obs.disconnect());
      };
    };

    // Ajouter l'attribut data-property-image aux images du carousel si elles existent
    const markImages = () => {
      const carouselImages = document.querySelectorAll('img[src*="firebase"], img[src*="property"]');
      carouselImages.forEach((img, index) => {
        img.setAttribute('data-property-image', String(index));
      });
    };

    // Initialiser le tracking
    markImages();
    window.addEventListener('scroll', handleScroll, { passive: true });
    const cleanupImages = observeImages();

    // Fonction pour envoyer les données
    const sendTrackingData = () => {
      if (hasTrackedRef.current || !startTimeRef.current) return;
      
      hasTrackedRef.current = true;
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const metadata: ViewMetadata = {
        userId: user?.uid,
        duration,
        scrollDepth: Math.round(scrollDepthRef.current),
        imagesViewed: Array.from(imagesViewedRef.current),
      };

      // Utiliser sendBeacon pour fiabilité même si la page se ferme
      const data = JSON.stringify({
        ...metadata,
      });

      // Essayer sendBeacon d'abord (plus fiable pour les pages qui se ferment)
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(
          `/api/property/${propertyId}/statistics/view`,
          blob
        );
      } else {
        // Fallback sur fetch si sendBeacon n'est pas disponible
        fetch(`/api/property/${propertyId}/statistics/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: data,
          keepalive: true, // Permet d'envoyer même si la page se ferme
        }).catch((error) => {
          logger.error('Failed to track property view', { propertyId, error });
        });
      }
    };

    // Tracking lors du départ de la page
    const handleBeforeUnload = () => {
      sendTrackingData();
    };

    // Tracking périodique (toutes les 30 secondes)
    const intervalId = setInterval(() => {
      if (scrollDepthRef.current > 0 || imagesViewedRef.current.size > 0) {
        sendTrackingData();
      }
    }, 30000); // 30 secondes

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload); // Pour les navigateurs modernes

    // Nettoyage
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      cleanupImages();
      
      // Envoyer les données finales au démontage
      sendTrackingData();
    };
  }, [propertyId, user?.uid]);
}
