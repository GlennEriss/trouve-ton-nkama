'use client';

import { useEffect, useRef } from 'react';
import { trackMetaPixelEvent } from '../services/meta-pixel.client';
import { metaPixelEvents } from '../domain/events';

type ViewedProperty = {
  id: string;
  title: string;
  price: number;
};

/**
 * ViewContent Meta (vue d'annonce) — un seul déclenchement par annonce affichée, même si le
 * composant re-render (scroll, changement de filtre des recommandations, etc.).
 */
export function useMetaPixelViewContent(property: ViewedProperty | null | undefined): void {
  const trackedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!property || trackedIdRef.current === property.id) return;
    trackedIdRef.current = property.id;

    void trackMetaPixelEvent(metaPixelEvents.VIEW_CONTENT, {
      content_type: 'product',
      content_ids: [property.id],
      content_name: property.title,
      value: property.price,
      currency: 'XAF',
    });
  }, [property]);
}
