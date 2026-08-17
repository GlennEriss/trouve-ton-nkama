/**
 * Règles de publication automatique d'une annonce sur la Page Facebook de la plateforme.
 *
 * Module pur (aucun accès réseau ni Firestore) pour rester testable, comme
 * new-announcement-policy.ts et favoris-property-policy.ts.
 */

export type PublishableProperty = Record<string, unknown>;

export type FacebookPostRecord = {
  id?: unknown;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Une annonce n'est publiée qu'au moment précis où la modération l'approuve.
 *
 * Le trigger Firestore se déclenche à CHAQUE écriture sur le document (changement de prix,
 * promotion, rafraîchissement...). Sans ces garde-fous, la même annonce repartirait sur la Page
 * à chaque modification.
 */
export function shouldPublishApprovedListing(
  before: PublishableProperty,
  after: PublishableProperty
): boolean {
  const beforeStatus = asString(before.moderationStatus);
  const afterStatus = asString(after.moderationStatus);

  // Transition vers APPROVED uniquement : une annonce déjà approuvée qu'on modifie ne
  // redéclenche rien.
  if (afterStatus !== 'APPROVED' || beforeStatus === 'APPROVED') {
    return false;
  }

  // Filet supplémentaire : si un post existe déjà, on ne republie jamais. Couvre les rejeux de
  // trigger (Cloud Functions garantit at-least-once, pas exactly-once) et une éventuelle
  // ré-approbation après un rejet.
  const existingPost = after.facebookPost as FacebookPostRecord | undefined;
  if (asString(existingPost?.id)) {
    return false;
  }

  // Une annonce archivée n'a rien à faire sur la Page, même approuvée.
  if (asString(after.state) === 'ARCHIVED') {
    return false;
  }

  return true;
}

function formatPrice(value: unknown): string {
  const price = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    return '';
  }
  // Espace insécable avant l'unité, séparateur de milliers français.
  return `${price.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`;
}

/**
 * Libellé de rangement : type de bien pour l'immobilier, catégorie feuille sinon. Même
 * discriminant (`typeProperty`) que l'API annonceur et les cartes d'annonce.
 */
function resolveCategoryLabel(property: PublishableProperty): string {
  const typeProperty = asString(property.typeProperty);
  if (typeProperty) {
    return typeProperty;
  }

  const categoryPath = property.categoryPath as { lvl1?: unknown } | undefined;
  const leaf = asString(categoryPath?.lvl1).split(' > ').pop()?.trim();
  return leaf || '';
}

export function buildListingUrl(propertyId: string, appUrl: string): string {
  // `/annonce/{id}` est l'URL publique canonique des deux univers (voir PreviewPropertyClient
  // et ButtonShareToFacebook), et c'est elle qui porte les balises OpenGraph.
  return `${appUrl.replace(/\/+$/, '')}/annonce/${propertyId}`;
}

/**
 * Texte du post. Facebook construit la carte visuelle (image, titre, description) à partir des
 * balises OpenGraph de la page annonce : inutile d'uploader la photo séparément.
 */
export function buildListingPostMessage(property: PublishableProperty, listingUrl: string): string {
  const title = asString(property.title) || 'Nouvelle annonce';
  const facts = [formatPrice(property.price), resolveCategoryLabel(property), asString(property.city)]
    .filter(Boolean)
    .join(' · ');

  return [title, facts, '', `👉 ${listingUrl}`].filter((line) => line !== undefined).join('\n');
}
