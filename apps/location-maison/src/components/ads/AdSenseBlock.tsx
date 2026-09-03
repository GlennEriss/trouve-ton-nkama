'use client'

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ADSENSE_CLIENT } from '@/lib/ads/config';
import { createLogger } from '@/lib/logger';
import { emitAdsSlotEvent } from '@/features/analytics/ads/services/ads-slot-analytics.client';

const logger = createLogger('components.ads.AdSenseBlock');

type AdSenseBlockProps = Readonly<{
  slot: string;
  slotKey: string;
  className?: string;
  minHeight?: number;
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal' | string;
  fullWidthResponsive?: boolean;
  onStatusChange?: (status: string | null) => void;
}>;

export default function AdSenseBlock({
  slot,
  slotKey,
  className,
  minHeight = 0,
  format = 'auto',
  fullWidthResponsive = true,
  onStatusChange,
}: AdSenseBlockProps) {
  const adRef = React.useRef<HTMLModElement | null>(null);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const uid = React.useMemo(() => {
    const user = session?.user as { uid?: unknown } | undefined;
    return typeof user?.uid === 'string' ? user.uid : null;
  }, [session?.user]);
  const isAuthenticated = status === 'authenticated';

  // useSession() résout de façon asynchrone ('loading' -> 'authenticated'/'unauthenticated'
  // peu après le montage) : sans cette indirection par ref, uid/isAuthenticated dans le tableau
  // de dépendances ci-dessous relançait l'effet principal — donc un second adsbygoogle.push({})
  // sur le MÊME nœud <ins> (slotKey/pathname inchangés, React ne le démonte pas) — quelques
  // centaines de ms après le premier, exactement l'erreur observée en prod ("All 'ins' elements
  // ... already have ads in them", AdSenseBlock.useEffect.tryInitialize). onStatusChange est
  // traité pareil par précaution : une identité de callback instable côté appelant aurait le
  // même effet, même si aucun appelant actuel n'en passe un.
  const actorRef = React.useRef({ uid, isAuthenticated, onStatusChange });
  React.useEffect(() => {
    actorRef.current = { uid, isAuthenticated, onStatusChange };
  }, [uid, isAuthenticated, onStatusChange]);

  React.useEffect(() => {
    let retries = 0;
    let cancelled = false;
    const initStart =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    const tryInitialize = () => {
      if (typeof window === 'undefined' || cancelled) {
        return true;
      }

      const adElement = adRef.current;
      if (!adElement) {
        return false;
      }

      // Google ne pose jamais 'done' — seulement 'filled' ou 'unfilled' une fois le slot
      // traité (voir globals.css:261,266, qui cible déjà ces deux valeurs réelles). Cette
      // vérification ne matchait donc jamais : un second push({}) sur un <ins> déjà traité
      // n'était jamais bloqué, d'où l'erreur "already have ads in them" observée en prod.
      const existingStatus = adElement.getAttribute('data-ad-status');
      if (existingStatus === 'filled' || existingStatus === 'unfilled') {
        return true;
      }

      const adsWindow = window as Window & { adsbygoogle?: Array<Record<string, unknown>> };
      if (!adsWindow.adsbygoogle) {
        return false;
      }

      try {
        adsWindow.adsbygoogle.push({});
        const now =
          typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
        emitAdsSlotEvent({
          slotId: slot,
          slotKey,
          eventName: 'ad_request_sent',
          pathname: pathname || '/',
          latencyMs: now - initStart,
          actor: {
            uid: actorRef.current.uid,
            isAuthenticated: actorRef.current.isAuthenticated,
          },
        });
        return true;
      } catch (error) {
        logger.warn('AdSense push failed', {
          error,
          slot,
          slotKey,
          adStatus: adElement.getAttribute('data-ad-status'),
        });
        return false;
      }
    };

    emitAdsSlotEvent({
      slotId: slot,
      slotKey,
      eventName: 'ad_slot_rendered',
      pathname: pathname || '/',
      actor: {
        uid: actorRef.current.uid,
        isAuthenticated: actorRef.current.isAuthenticated,
      },
    });

    const adElement = adRef.current;
    let observer: MutationObserver | null = null;
    if (adElement && typeof MutationObserver !== 'undefined') {
      actorRef.current.onStatusChange?.(adElement.getAttribute('data-ad-status'));
      observer = new MutationObserver(() => {
        const adStatus = adElement.getAttribute('data-ad-status');
        actorRef.current.onStatusChange?.(adStatus);
        if (adStatus === 'filled') {
          emitAdsSlotEvent({
            slotId: slot,
            slotKey,
            eventName: 'ad_filled',
            pathname: pathname || '/',
            actor: {
              uid: actorRef.current.uid,
              isAuthenticated: actorRef.current.isAuthenticated,
            },
          });
          emitAdsSlotEvent({
            slotId: slot,
            slotKey,
            eventName: 'ad_impression',
            pathname: pathname || '/',
            actor: {
              uid: actorRef.current.uid,
              isAuthenticated: actorRef.current.isAuthenticated,
            },
          });
        }
      });

      observer.observe(adElement, {
        attributes: true,
        attributeFilter: ['data-ad-status'],
      });
    }

    if (tryInitialize()) {
      return () => {
        cancelled = true;
        observer?.disconnect();
      };
    }

    const intervalId = window.setInterval(() => {
      if (tryInitialize()) {
        window.clearInterval(intervalId);
        return;
      }

      retries += 1;
      if (retries >= 20) {
        window.clearInterval(intervalId);
        logger.warn('AdSense slot init timeout', { slot, slotKey });
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      observer?.disconnect();
    };
    // uid/isAuthenticated/onStatusChange sont volontairement absents : ils n'affectent ni le
    // <ins> ciblé ni le besoin d'un push({}) (lus via actorRef ci-dessus, toujours à jour), et
    // les faire varier ici relançait cet effet sur le MÊME nœud DOM (slotKey/pathname
    // inchangés) à chaque résolution de session — la cause racine du double push.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, slotKey, pathname]);

  return (
    <div className={className}>
      <ins
        key={slotKey}
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
        data-slot-key={slotKey}
      />
    </div>
  );
}
