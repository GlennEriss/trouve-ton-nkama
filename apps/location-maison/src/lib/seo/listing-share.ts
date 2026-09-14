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

// Longueur de repli sûre pour og:description/twitter:description — les crawlers de partage
// (WhatsApp en particulier, plus agressif que Facebook) tronquent eux-mêmes une description trop
// longue, souvent en plein milieu d'un mot ("...Le logem..."). En tronquant nous-mêmes ici, à une
// coupure de mot propre suivie d'une seule ellipse, l'aperçu reste lisible quel que soit le
// crawler — au lieu de dépendre d'un comportement de troncature externe non garanti.
const SHARE_DESCRIPTION_MAX_LENGTH = 155;

export function buildListingShareDescription(description: string): string {
  const normalized = description.trim();
  if (normalized.length <= SHARE_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  const truncated = normalized.slice(0, SHARE_DESCRIPTION_MAX_LENGTH);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  const clean = lastSpaceIndex > 0 ? truncated.slice(0, lastSpaceIndex) : truncated;
  return `${clean.trimEnd()}…`;
}

export function buildListingShareTitle(
  property: Pick<Property, 'title' | 'price' | 'street' | 'city' | 'province' | 'latitude' | 'longitude' | 'zones'>,
): string {
  const location = getListingLocationLabel(property);
  const priceAndLocation = [formatListingPrice(property), location].filter(Boolean).join(' · ');
  return [property.title, priceAndLocation].filter(Boolean).join(' — ');
}
