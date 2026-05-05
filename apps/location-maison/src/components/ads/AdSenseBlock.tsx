'use client'

import React from 'react';
import { ADSENSE_CLIENT } from '@/lib/ads/config';
import { createLogger } from '@/lib/logger';

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

  React.useEffect(() => {
    let retries = 0;
    let cancelled = false;

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

    if (tryInitialize()) {
      return () => {
        cancelled = true;
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
    };
  }, [slot, slotKey]);

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
