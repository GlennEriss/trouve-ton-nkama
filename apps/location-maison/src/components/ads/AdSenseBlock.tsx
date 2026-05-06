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
}>;

export default function AdSenseBlock({
  slot,
  slotKey,
  className,
  minHeight = 90,
  format = 'auto',
  fullWidthResponsive = true,
}: AdSenseBlockProps) {
  const adRef = React.useRef<HTMLModElement | null>(null);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const uid = React.useMemo(() => {
    const user = session?.user as { uid?: unknown } | undefined;
    return typeof user?.uid === 'string' ? user.uid : null;
  }, [session?.user]);
  const isAuthenticated = status === 'authenticated';

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

      if (adElement.getAttribute('data-ad-status') === 'done') {
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
            uid,
            isAuthenticated,
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
        uid,
        isAuthenticated,
      },
    });

    const adElement = adRef.current;
    let observer: MutationObserver | null = null;
    if (adElement && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        const adStatus = adElement.getAttribute('data-ad-status');
        if (adStatus === 'filled') {
          emitAdsSlotEvent({
            slotId: slot,
            slotKey,
            eventName: 'ad_filled',
            pathname: pathname || '/',
            actor: {
              uid,
              isAuthenticated,
            },
          });
          emitAdsSlotEvent({
            slotId: slot,
            slotKey,
            eventName: 'ad_impression',
            pathname: pathname || '/',
            actor: {
              uid,
              isAuthenticated,
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
  }, [slot, slotKey, pathname, uid, isAuthenticated]);

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
      />
    </div>
  );
}
