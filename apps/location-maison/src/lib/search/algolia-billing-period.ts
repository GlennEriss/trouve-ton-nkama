/**
 * Cycle de facturation Algolia (plan Grow) : la période ne suit PAS le mois calendaire,
 * elle est ancrée au jour d'anniversaire de l'abonnement. La facture reçue le 2026-09-09
 * couvre « August 09, 2026 to September 08, 2026 » -> ancre = le 9, remise à zéro du quota
 * de 10 000 requêtes au début du 9 (UTC supposé, à confirmer dans le dashboard Algolia).
 *
 * Voir docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md §2.
 *
 * Logique pure, sans I/O — dupliquée à l'identique côté Cloud Functions
 * (functions/src/search/algolia-billing-period.ts) car les deux packages ne partagent pas
 * de code. Toute correction ici doit être reportée là-bas (couvert par les tests des deux
 * côtés).
 */

const DEFAULT_ANCHOR_DAY = 9;

/** Jour du mois où le quota Algolia repart de zéro (1–28). Réglable si le plan change. */
export function billingAnchorDay(): number {
  const parsed = Number(process.env.ALGOLIA_BILLING_ANCHOR_DAY);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 28) {
    return parsed;
  }
  return DEFAULT_ANCHOR_DAY;
}

/** Quota de requêtes de recherche inclus dans la période (plan Grow : 10 000). */
export function monthlyQuota(): number {
  const parsed = Number(process.env.ALGOLIA_MONTHLY_QUOTA);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

/**
 * Seuil de bascule vers Meilisearch : marge sous le quota pour absorber le retard du
 * compteur (cache mémoire 60 s + plusieurs instances Vercel). Défaut : 90 % du quota.
 */
export function softLimit(): number {
  const parsed = Number(process.env.ALGOLIA_QUOTA_SOFT_LIMIT);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return Math.floor(monthlyQuota() * 0.9);
}

/** Seuil d'alerte (par défaut 80 % du quota). */
export function alertThreshold(): number {
  const parsed = Number(process.env.ALGOLIA_QUOTA_ALERT_AT);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return Math.floor(monthlyQuota() * 0.8);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Clé de la période de facturation contenant `date`, au format `YYYY-MM` du mois de DÉBUT
 * de période.
 *
 * Ancre = 9 : le 2026-09-20 -> "2026-09" (période 09/09 → 08/10) ; le 2026-09-03 ->
 * "2026-08" (période 09/08 → 08/09).
 */
export function billingPeriodKey(date: Date = new Date(), anchorDay: number = billingAnchorDay()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0–11
  const day = date.getUTCDate();

  if (day >= anchorDay) {
    return `${year}-${pad2(month + 1)}`;
  }
  // Avant l'ancre : la période a commencé le mois précédent.
  const prev = new Date(Date.UTC(year, month, 1));
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  return `${prev.getUTCFullYear()}-${pad2(prev.getUTCMonth() + 1)}`;
}

export interface BillingPeriodRange {
  key: string;
  /** Début inclus (00:00:00 UTC de l'ancre). */
  start: Date;
  /** Fin exclue (00:00:00 UTC de l'ancre du mois suivant). */
  end: Date;
  /** Libellé lisible, ex. "09/09/2026 → 08/10/2026". */
  label: string;
}

/** Bornes de la période désignée par `key` (`YYYY-MM`). */
export function billingPeriodRange(key: string, anchorDay: number = billingAnchorDay()): BillingPeriodRange {
  const [yearStr, monthStr] = key.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0–11

  const start = new Date(Date.UTC(year, month, anchorDay));
  const end = new Date(Date.UTC(year, month + 1, anchorDay));
  const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

  return { key, start, end, label: `${fmt(start)} → ${fmt(lastDay)}` };
}

/** `true` si `key` désigne une période antérieure à celle qui contient `now`. */
export function isPeriodStale(key: string | undefined | null, now: Date = new Date()): boolean {
  if (!key) return true;
  return key !== billingPeriodKey(now);
}
