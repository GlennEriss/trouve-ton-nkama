/**
 * Noms d'événements standards Meta (Pixel + Conversions API) — voir
 * https://developers.facebook.com/docs/meta-pixel/reference#standard-events
 * On utilise des événements standards plutôt que custom partout où c'est possible : ils sont
 * seuls utilisables comme objectif d'optimisation de campagne sans configuration de conversion
 * personnalisée supplémentaire côté Business Manager.
 */
export const metaPixelEvents = {
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  CONTACT: 'Contact',
} as const;

export type MetaPixelEventName = (typeof metaPixelEvents)[keyof typeof metaPixelEvents];

export type MetaPixelCustomData = {
  content_type?: 'product';
  content_ids?: string[];
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  contact_method?: 'phone' | 'whatsapp';
};
