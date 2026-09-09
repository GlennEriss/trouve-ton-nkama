/**
 * Cycle de facturation Algolia (plan Grow) : la période ne suit PAS le mois calendaire,
 * elle est ancrée au jour d'anniversaire de l'abonnement (le 9). Voir
 * docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md §2.
 *
 * ⚠️ Copie fidèle de apps/location-maison/src/lib/search/algolia-billing-period.ts —
 * les deux packages ne partagent pas de code. Toute correction doit être reportée des
 * deux côtés (chacun a ses tests).
 */

const DEFAULT_ANCHOR_DAY = 9;

export function billingAnchorDay(): number {
  const parsed = Number(process.env.ALGOLIA_BILLING_ANCHOR_DAY);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 28) {
    return parsed;
  }
  return DEFAULT_ANCHOR_DAY;
}

export function monthlyQuota(): number {
  const parsed = Number(process.env.ALGOLIA_MONTHLY_QUOTA);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

export function softLimit(): number {
  const parsed = Number(process.env.ALGOLIA_QUOTA_SOFT_LIMIT);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return Math.floor(monthlyQuota() * 0.9);
}

export function alertThreshold(): number {
  const parsed = Number(process.env.ALGOLIA_QUOTA_ALERT_AT);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return Math.floor(monthlyQuota() * 0.8);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function billingPeriodKey(date: Date = new Date(), anchorDay: number = billingAnchorDay()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (day >= anchorDay) {
    return `${year}-${pad2(month + 1)}`;
  }
  const prev = new Date(Date.UTC(year, month, 1));
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  return `${prev.getUTCFullYear()}-${pad2(prev.getUTCMonth() + 1)}`;
}

export interface BillingPeriodRange {
  key: string;
  start: Date;
  end: Date;
  label: string;
}

export function billingPeriodRange(key: string, anchorDay: number = billingAnchorDay()): BillingPeriodRange {
  const [yearStr, monthStr] = key.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, month, anchorDay));
  const end = new Date(Date.UTC(year, month + 1, anchorDay));
  const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const fmt = (d: Date) => `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  return { key, start, end, label: `${fmt(start)} → ${fmt(lastDay)}` };
}

export function isPeriodStale(key: string | undefined | null, now: Date = new Date()): boolean {
  if (!key) return true;
  return key !== billingPeriodKey(now);
}
