import type { PropertyHit } from '../api/algolia';
import type { PropertyListItem } from '../api/property';

// PropertyHit (Algolia, tous champs optionnels) -> forme attendue par PropertyCard (mêmes noms
// que PropertyListItem, `id` plutôt qu'`objectID`) — partagé entre HomeScreen et SearchScreen
// pour n'avoir qu'un seul jeu de filets (`item.title ?? 'Annonce'`, etc.).
export function toPropertyListItem(hit: PropertyHit): PropertyListItem {
  return {
    id: hit.objectID,
    title: hit.title ?? 'Annonce',
    price: hit.price ?? 0,
    status: hit.status ?? 'FOR_RENT',
    city: hit.city ?? '',
    province: hit.province ?? '',
    cities: hit.cities,
    typeProperty: hit.typeProperty ?? '',
    images: hit.images ?? [],
  };
}
