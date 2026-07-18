import type { Property } from '@/models/annonce';

/**
 * Formatage prix/localisation pour les aperçus de partage (og:title, og:description, image
 * og:image) — même convention que l'affichage in-app (voir PreviewProperty.tsx : "FCFA
 * {price}" et "{street}, {city}"), pour que l'aperçu WhatsApp/Facebook corresponde à ce que
 * l'utilisateur voit déjà sur la page.
 */

export function formatListingPrice(property: Pick<Property, 'price'>): string {
  return `FCFA ${property.price.toLocaleString('fr-FR')}`;
}

export function getListingLocationLabel(property: Pick<Property, 'street' | 'city'>): string {
  return [property.street, property.city].filter(Boolean).join(', ');
}

export function getListingStatusLabel(status: Property['status']): string {
  return status === 'FOR_RENT' ? 'À louer' : 'À vendre';
}

export function buildListingShareTitle(property: Pick<Property, 'title' | 'price' | 'street' | 'city'>): string {
  const location = getListingLocationLabel(property);
  const priceAndLocation = [formatListingPrice(property), location].filter(Boolean).join(' · ');
  return [property.title, priceAndLocation].filter(Boolean).join(' — ');
}
