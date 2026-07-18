'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackMetaPixelPageView } from '../services/meta-pixel.client';

/**
 * Réémet PageView à chaque navigation côté client (App Router = pas de rechargement complet,
 * donc pas de nouveau <script> pour retrigger le PageView du code de base) — même mécanisme de
 * dédup par chemin que FirebaseAnalyticsTracker.
 */
export function MetaPixelPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string | null>(null);

  const search = useMemo(() => {
    const raw = searchParams?.toString();
    return raw ? `?${raw}` : '';
  }, [searchParams]);

  useEffect(() => {
    if (!pathname) return;

    const currentPath = `${pathname}${search}`;
    if (lastTrackedPathRef.current === null) {
      // Le code de base (MetaPixelScript) a déjà émis le PageView du 1er chargement.
      lastTrackedPathRef.current = currentPath;
      return;
    }
    if (lastTrackedPathRef.current === currentPath) return;
    lastTrackedPathRef.current = currentPath;

    trackMetaPixelPageView();
  }, [pathname, search]);

  return null;
}
