import type { Property } from '@/models/annonce';
import { formatZonesLabel, getListingZones } from '@/lib/listing-zones';

/**
 * Formatage prix/localisation pour les aperçus de partage (og:title, og:description, image
 * og:image) — même convention que l'affichage in-app (voir PreviewProperty.tsx : "FCFA
 * {price}" et "{street}, {city}"), pour que l'aperçu WhatsApp/Facebook corresponde à ce que
 * l'utilisateur voit déjà sur la page.
 */

export function formatListingPrice(property: Pick<Property, 'price'>): string {
  return `FCFA ${property.price.toLocaleString('fr-FR')}`;
}

/**
 * Immobilier (pas de `zones`) : comportement historique inchangé, "street, city". Mode etc.
 * (`zones` multiples possibles) : "street, Libreville, Franceville +N" — voir
 * docs/marketplace-multi-categories/08-zones-multiples-mode.md §4.7. `formatZonesLabel`
 * d'une annonce à zone unique renvoie exactement `city`, donc aucun changement de rendu pour
 * l'immobilier ni pour une annonce Mode pré-migration (repli automatique).
 */
export function getListingLocationLabel(
  property: Pick<Property, 'street' | 'city' | 'province' | 'latitude' | 'longitude' | 'zones'>,
): string {
  return [property.street, formatZonesLabel(getListingZones(property))].filter(Boolean).join(', ');
}

export function getListingStatusLabel(status: Property['status']): string {
  return status === 'FOR_RENT' ? 'À louer' : 'À vendre';
}

export function buildListingShareTitle(
  property: Pick<Property, 'title' | 'price' | 'street' | 'city' | 'province' | 'latitude' | 'longitude' | 'zones'>,
): string {
  const location = getListingLocationLabel(property);
  const priceAndLocation = [formatListingPrice(property), location].filter(Boolean).join(' · ');
  return [property.title, priceAndLocation].filter(Boolean).join(' — ');
}
