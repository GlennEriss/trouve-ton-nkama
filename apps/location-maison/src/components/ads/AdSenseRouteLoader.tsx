'use client'

import React from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { isPropertyFormFlowPath } from '@/lib/ads/route-guards';
import { ADSENSE_CLIENT } from '@/lib/ads/config';

const ADSENSE_SCRIPT_ID = 'adsense-loader-global';
const ADS_DISABLED_CLASS = 'ads-disabled-route';

const AD_SELECTORS = [
  'ins.adsbygoogle',
  '.google-auto-placed',
  '[id^="google_ads_iframe"]',
  '[id^="aswift_"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="doubleclick.net"]',
];

function purgeAdsFromDom() {
  if (typeof document === 'undefined') return;

  const nodes = document.querySelectorAll(AD_SELECTORS.join(','));
  nodes.forEach((node) => {
    const autoPlacedContainer = node.closest('.google-auto-placed');
    if (autoPlacedContainer) {
      autoPlacedContainer.remove();
      return;
    }
    node.remove();
  });
}

export default function AdSenseRouteLoader() {
  const pathname = usePathname();
  const disableAdsForRoute = isPropertyFormFlowPath(pathname);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    if (disableAdsForRoute) {
      root.classList.add(ADS_DISABLED_CLASS);
      purgeAdsFromDom();

      const delayedCleanup = window.setTimeout(() => {
        purgeAdsFromDom();
      }, 350);

      return () => {
        window.clearTimeout(delayedCleanup);
      };
    }

    root.classList.remove(ADS_DISABLED_CLASS);
  }, [disableAdsForRoute, pathname]);

  if (disableAdsForRoute) {
    return null;
  }

  return (
    <Script
      id={ADSENSE_SCRIPT_ID}
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
