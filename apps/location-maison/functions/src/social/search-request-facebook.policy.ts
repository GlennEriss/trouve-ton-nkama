/**
 * Règles de publication automatique d'une demande de recherche sur la Page Facebook de la
 * plateforme — même principe que facebook-page.policy.ts (annonces), pour la collection
 * `search_requests` (contenu acheteur, l'inverse d'une annonce vendeur).
 *
 * Module pur (aucun accès réseau ni Firestore) pour rester testable, comme facebook-page.policy.ts.
 */

import { buildSocialFooter } from './social-links';

export type PublishableSearchRequest = Record<string, unknown>;

export type FacebookPostRecord = {
  id?: unknown;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Dupliqué depuis packages/core/src/domain/property-type.ts : functions/ n'a pas ce package en
// dépendance (voir social-links.ts pour la même contrainte/le même choix sur les liens
// institutionnels) — pas la peine d'en ajouter une pour un simple libellé d'affichage. À
// resynchroniser si de nouveaux types de bien sont ajoutés côté app.
const TYPE_PROPERTY_LABELS: Record<string, string> = {
  Home: 'Maison',
  Apartment: 'Appartement',
  Studio: 'Studio',
  Room: 'Chambre',
  Kiosk: 'Kiosque',
  Shop: 'Magasin',
  Desk: 'Bureau',
  Building: 'Immeuble',
  Land: 'Terrain',
  Villa: 'Villa',
  Duplex: 'Duplex',
  Warehouse: 'Entrepôt',
};

/**
 * Une demande de recherche n'est publiée qu'au moment précis où la modération l'approuve —
 * même garde-fou que shouldPublishApprovedListing (property) : le trigger Firestore se
 * déclenche à CHAQUE écriture sur le document, pas seulement l'approbation.
 */
export function shouldPublishApprovedSearchRequest(
  before: PublishableSearchRequest,
  after: PublishableSearchRequest
): boolean {
  const beforeStatus = asString(before.moderationStatus);
  const afterStatus = asString(after.moderationStatus);

  if (afterStatus !== 'APPROVED' || beforeStatus === 'APPROVED') {
    return false;
  }

  // Filet supplémentaire : si un post existe déjà, on ne republie jamais (rejeu de trigger,
  // Cloud Functions garantit at-least-once pas exactly-once ; ou ré-approbation après rejet).
  const existingPost = after.facebookPost as FacebookPostRecord | undefined;
  if (asString(existingPost?.id)) {
    return false;
  }

  // Une demande archivée n'a rien à faire sur la Page, même approuvée.
  if (asString(after.state) === 'ARCHIVED') {
    return false;
  }

  return true;
}

function resolveTypeLabel(searchRequest: PublishableSearchRequest): string {
  const key = asString(searchRequest.typeProperty);
  return TYPE_PROPERTY_LABELS[key] || key;
}

function resolveTransactionLabel(searchRequest: PublishableSearchRequest): string {
  return asString(searchRequest.transactionType) === 'FOR_SALE' ? 'à acheter' : 'à louer';
}

function resolveLocationLabel(searchRequest: PublishableSearchRequest): string {
  const city = asString(searchRequest.city);
  const neighborhood = asString(searchRequest.neighborhood);
  return [city, neighborhood].filter(Boolean).join(', ') || asString(searchRequest.province);
}

function formatBudget(min: unknown, max: unknown): string {
  const minNum = typeof min === 'number' ? min : Number(min);
  const maxNum = typeof max === 'number' ? max : Number(max);
  const hasMin = Number.isFinite(minNum) && minNum > 0;
  const hasMax = Number.isFinite(maxNum) && maxNum > 0;
  const format = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

  if (hasMin && hasMax) return `Budget : ${format(minNum)} - ${format(maxNum)}`;
  if (hasMin) return `Budget : à partir de ${format(minNum)}`;
  if (hasMax) return `Budget : jusqu'à ${format(maxNum)}`;
  return '';
}

/**
 * Pas de page individuelle par demande (contrairement à /annonce/{id} pour une annonce) : une
 * demande de recherche n'a aujourd'hui aucune URL publique dédiée, et en créer une exposerait à
 * une URL indexable stable le numéro WhatsApp qu'elle contient — décision explicite de garder
 * ce post pointé vers la liste plutôt que d'ajouter cette page.
 */
export function buildSearchRequestsListUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, '')}/demandes-recherche`;
}

export function buildSearchRequestPostMessage(
  searchRequest: PublishableSearchRequest,
  listUrl: string
): string {
  const typeLabel = resolveTypeLabel(searchRequest);
  const transactionLabel = resolveTransactionLabel(searchRequest);
  const location = resolveLocationLabel(searchRequest);

  const headline = `🔍 Recherche ${typeLabel || 'un bien'} ${transactionLabel}${location ? ` — ${location}` : ''}`;
  const facts = [formatBudget(searchRequest.budgetMinXaf, searchRequest.budgetMaxXaf), asString(searchRequest.description)]
    .filter(Boolean)
    .join('\n');

  return [
    headline,
    facts,
    '',
    `👉 Vous avez peut-être ce qu'il faut : ${listUrl}`,
    '',
    '—',
    buildSocialFooter(),
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}
