/**
 * Expiration des promotions payantes (à la une, tendance 7j/3j) devenues obsolètes.
 *
 * Nécessaire pour que le classement Algolia reste correct dans la durée : contrairement à
 * /api/property/promoted (qui recalcule la validité à chaque lecture en comparant endDate à
 * "maintenant"), le customRanking Algolia ne compare jamais une valeur stockée au moment de la
 * requête — il trie sur la valeur telle que synchronisée au dernier écrit. Sans ce nettoyage,
 * une promotion expirée depuis des mois continuerait de battre une annonce fraîche simplement
 * parce qu'elle POSSÈDE un `currentPromotion.endDate`, même ancien.
 *
 * Le boost est volontairement exclu : sa durée est 0 par conception (voir promote/route.ts),
 * son effet est porté par `sortTimestamp`/`lastBoostedAt`, pas par une fenêtre isActive à
 * expirer.
 *
 * ⚠️ Bug réel corrigé le 2026-09-01 : le nettoyage ne faisait passer `isActive` à `false` que
 * côté écriture, sans jamais toucher `endDate` — exactement le scénario que ce commentaire
 * décrivait déjà en théorie, resté vrai en pratique. L'index Algolia a pour customRanking
 * `["desc(currentPromotion.endDate)", "desc(sortTimestamp)"]`, qui ne lit jamais `isActive` :
 * une annonce promue une seule fois, même il y a un an, restait donc classée en tête de /search
 * pour toujours, devant des annonces bien plus récentes jamais promues. Confirmé en interrogeant
 * directement l'index de prod (993 résultats : les 58 premiers étaient d'anciennes promotions
 * expirées remontant à avril 2025, les annonces réellement récentes d'août 2026 commençaient
 * seulement en position 58). `buildExpiryUpdate()` supprime maintenant aussi
 * `currentPromotion.endDate` : Algolia traite un attribut de `customRanking` absent comme la
 * valeur la plus basse possible, donc une promotion expirée ne bat plus jamais rien sur ce
 * critère, y compris longtemps après son expiration.
 */

import { FieldValue } from 'firebase-admin/firestore';

type RawTimestamp = { toMillis?: () => number; seconds?: number } | null | undefined;

export type RawPropertyRecord = {
  isPromoted?: unknown;
  currentPromotion?: {
    type?: unknown;
    isActive?: unknown;
    endDate?: RawTimestamp;
  } | null;
};

const EXPIRABLE_TYPES = new Set(['featured', 'trending-7d', 'trending-3d']);

function endDateMillis(endDate: RawTimestamp): number {
  if (!endDate) return 0;
  if (typeof endDate.toMillis === 'function') return endDate.toMillis();
  if (typeof endDate.seconds === 'number') return endDate.seconds * 1000;
  return 0;
}

/**
 * @returns `true` si le document a une promotion active (featured/trending) dont la date de
 * fin est dépassée — c'est-à-dire un cas que `/api/property/promoted` traiterait déjà comme
 * "non promue" à la lecture, mais que Firestore/Algolia affichent encore comme actif.
 */
export function needsPromotionExpiry(property: RawPropertyRecord, nowMillis: number): boolean {
  const promotion = property.currentPromotion;
  if (!promotion) return false;

  const type = typeof promotion.type === 'string' ? promotion.type : '';
  if (!EXPIRABLE_TYPES.has(type)) return false;

  if (promotion.isActive !== true) return false;

  return endDateMillis(promotion.endDate) <= nowMillis;
}

/**
 * Payload de mise à jour Firestore pour une promotion qui vient d'expirer (voir
 * `needsPromotionExpiry`). Supprime `currentPromotion.endDate` en plus de désactiver
 * `isActive`/`isPromoted` — indispensable pour que le customRanking Algolia (voir le
 * commentaire de tête de ce fichier) cesse de classer cette annonce en tête de /search sur la
 * seule base d'une date de fin désormais dépassée.
 */
export function buildExpiryUpdate(): {
  isPromoted: false;
  'currentPromotion.isActive': false;
  'currentPromotion.endDate': FirebaseFirestore.FieldValue;
} {
  return {
    isPromoted: false,
    'currentPromotion.isActive': false,
    'currentPromotion.endDate': FieldValue.delete(),
  };
}
