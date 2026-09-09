import type { App } from 'firebase-admin/app';

import { createLogger } from '@/lib/logger';
import { MemoryCacheStore } from '@/lib/cache';
import {
  alertThreshold,
  billingPeriodKey,
  billingPeriodRange,
  isPeriodStale,
  monthlyQuota,
  softLimit,
} from './algolia-billing-period';

/**
 * Compteur de consommation Algolia, aligné sur le cycle de facturation (du 9 au 8, voir
 * algolia-billing-period.ts). Source de vérité : un unique document Firestore
 * `system_config/algolia-quota` — jamais la mémoire, car le site tourne sur Vercel en
 * plusieurs instances éphémères.
 *
 * Phase A (ce fichier) : le compteur est en **mode observation**. On incrémente à chaque
 * requête réellement envoyée à Algolia et on expose l'état (pour l'alerte + la carte
 * admin), mais `getSearchMode()` renvoie toujours "ALGOLIA" tant que `SEARCH_QUOTA_ENFORCE`
 * n'est pas activé (Phase C, quand Meilisearch peut prendre le relais).
 *
 * firebase-admin est chargé paresseusement : importer ce module (fait par le chemin SEO,
 * rendu au build) ne doit pas déclencher l'init de l'Admin SDK.
 *
 * Voir docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md §4 et §11.
 */

const logger = createLogger('search.algolia-quota');

export const QUOTA_COLLECTION = 'system_config';
export const QUOTA_DOC_ID = 'algolia-quota';

export type SearchMode = 'ALGOLIA' | 'MEILISEARCH_ONLY';

export interface AlgoliaQuotaStatus {
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  count: number;
  limit: number;
  softLimit: number;
  alertAt: number;
  usageRatio: number;
  mode: SearchMode;
  /** `true` dès que le compteur dépasse le seuil de bascule, enforcement ou non. */
  overSoftLimit: boolean;
  overLimit: boolean;
  /** `true` si la bascule est réellement appliquée aujourd'hui (Phase C). En Phase A, toujours `false`. */
  enforced: boolean;
  switchedAt: string | null;
  lastAlertAt: string | null;
  updatedAt: string | null;
}

type FirestoreTimestampLike = { toDate: () => Date };

interface NormalizedDoc {
  periodKey: string;
  count: number;
  limit: number;
  softLimit: number;
  alertAt: number;
  mode: SearchMode;
  switchedAt: FirestoreTimestampLike | null;
  lastAlertAt: FirestoreTimestampLike | null;
  updatedAt: FirestoreTimestampLike | null;
}

// Cache mémoire dédié : évite une lecture Firestore du document de quota à chaque requête
// de recherche. TTL court -> le compteur vu par une instance retarde d'au plus
// STATUS_CACHE_TTL_SECONDS, d'où la marge du softLimit.
const STATUS_CACHE_TTL_SECONDS = 60;
const STATUS_CACHE_KEY = 'search:algolia-quota:status';
const statusCache = new MemoryCacheStore(8);

async function getAdmin(): Promise<{
  db: FirebaseFirestore.Firestore;
  ref: FirebaseFirestore.DocumentReference;
  FieldValue: typeof import('firebase-admin/firestore').FieldValue;
  Timestamp: typeof import('firebase-admin/firestore').Timestamp;
}> {
  const [{ adminApp }, { getFirestore, FieldValue, Timestamp }] = await Promise.all([
    import('@/firebase/admin'),
    import('firebase-admin/firestore'),
  ]);
  const db = getFirestore(adminApp as App);
  return { db, ref: db.collection(QUOTA_COLLECTION).doc(QUOTA_DOC_ID), FieldValue, Timestamp };
}

/** `true` quand la bascule automatique doit réellement être appliquée (Phase C). */
export function isQuotaEnforced(): boolean {
  return (
    process.env.SEARCH_QUOTA_ENFORCE === 'true' &&
    Boolean(process.env.MEILISEARCH_HOST) &&
    Boolean(process.env.MEILISEARCH_SEARCH_API_KEY)
  );
}

function freshDoc(periodKey: string): NormalizedDoc {
  return {
    periodKey,
    count: 0,
    limit: monthlyQuota(),
    softLimit: softLimit(),
    alertAt: alertThreshold(),
    mode: 'ALGOLIA',
    switchedAt: null,
    lastAlertAt: null,
    updatedAt: null,
  };
}

function asTimestamp(value: unknown): FirestoreTimestampLike | null {
  return value && typeof (value as FirestoreTimestampLike).toDate === 'function'
    ? (value as FirestoreTimestampLike)
    : null;
}

function normalize(raw: FirebaseFirestore.DocumentData | undefined, currentPeriod: string): NormalizedDoc {
  const base = freshDoc(currentPeriod);
  if (!raw || isPeriodStale(typeof raw.periodKey === 'string' ? raw.periodKey : undefined)) {
    return base;
  }
  return {
    periodKey: raw.periodKey,
    count: Number.isFinite(raw.count) ? Number(raw.count) : 0,
    limit: Number.isFinite(raw.limit) ? Number(raw.limit) : base.limit,
    softLimit: Number.isFinite(raw.softLimit) ? Number(raw.softLimit) : base.softLimit,
    alertAt: Number.isFinite(raw.alertAt) ? Number(raw.alertAt) : base.alertAt,
    mode: raw.mode === 'MEILISEARCH_ONLY' ? 'MEILISEARCH_ONLY' : 'ALGOLIA',
    switchedAt: asTimestamp(raw.switchedAt),
    lastAlertAt: asTimestamp(raw.lastAlertAt),
    updatedAt: asTimestamp(raw.updatedAt),
  };
}

function toStatus(doc: NormalizedDoc): AlgoliaQuotaStatus {
  const range = billingPeriodRange(doc.periodKey);
  return {
    periodKey: doc.periodKey,
    periodLabel: range.label,
    periodStart: range.start.toISOString(),
    periodEnd: range.end.toISOString(),
    count: doc.count,
    limit: doc.limit,
    softLimit: doc.softLimit,
    alertAt: doc.alertAt,
    usageRatio: doc.limit > 0 ? doc.count / doc.limit : 0,
    mode: doc.mode,
    overSoftLimit: doc.count >= doc.softLimit,
    overLimit: doc.count >= doc.limit,
    enforced: isQuotaEnforced() && doc.mode === 'MEILISEARCH_ONLY',
    switchedAt: doc.switchedAt?.toDate().toISOString() ?? null,
    lastAlertAt: doc.lastAlertAt?.toDate().toISOString() ?? null,
    updatedAt: doc.updatedAt?.toDate().toISOString() ?? null,
  };
}

/**
 * Lit l'état du quota (cache mémoire 60 s). Ne déclenche PAS de remise à zéro : une période
 * périmée est renvoyée comme « période courante, compteur 0 » sans écrire — la remise à
 * zéro effective revient à `recordAlgoliaQueries()` (lazy) ou à la Cloud Function planifiée.
 */
export async function getQuotaStatus(): Promise<AlgoliaQuotaStatus> {
  const cached = await statusCache.get<AlgoliaQuotaStatus>(STATUS_CACHE_KEY);
  if (cached) return cached;

  const currentPeriod = billingPeriodKey();
  let status: AlgoliaQuotaStatus;
  try {
    const { ref } = await getAdmin();
    const snap = await ref.get();
    status = toStatus(normalize(snap.data(), currentPeriod));
  } catch (error) {
    logger.warn('Lecture du document de quota Algolia impossible — fail-open sur ALGOLIA', { error });
    status = toStatus(freshDoc(currentPeriod));
  }

  await statusCache.set(STATUS_CACHE_KEY, status, STATUS_CACHE_TTL_SECONDS);
  return status;
}

/** Invalide le cache mémoire (après une écriture qui doit être visible immédiatement). */
export async function invalidateQuotaStatusCache(): Promise<void> {
  await statusCache.del(STATUS_CACHE_KEY);
}

/**
 * Enregistre `count` requêtes réellement envoyées à Algolia (= `missIndexes.length` du
 * proxy — les hits de cache ne coûtent rien et ne sont pas comptés). Crée le document au
 * besoin et remet le compteur à zéro de façon transactionnelle quand la période a changé.
 */
export async function recordAlgoliaQueries(count: number): Promise<void> {
  if (!Number.isFinite(count) || count <= 0) return;

  const currentPeriod = billingPeriodKey();
  try {
    const { db, ref, FieldValue, Timestamp } = await getAdmin();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Timestamp.now();
      const storedPeriod = snap.exists ? (snap.data()?.periodKey as string | undefined) : undefined;

      if (!snap.exists || isPeriodStale(storedPeriod)) {
        tx.set(ref, {
          periodKey: currentPeriod,
          count,
          limit: monthlyQuota(),
          softLimit: softLimit(),
          alertAt: alertThreshold(),
          mode: 'ALGOLIA',
          switchedAt: null,
          lastAlertAt: null,
          lastReconciledAt: null,
          updatedAt: now,
        });
        return;
      }

      tx.update(ref, {
        count: FieldValue.increment(count),
        limit: monthlyQuota(),
        softLimit: softLimit(),
        alertAt: alertThreshold(),
        updatedAt: now,
      });
    });
  } catch (error) {
    // Ne jamais faire échouer une recherche à cause du compteur.
    logger.warn('Incrément du compteur de quota Algolia impossible', { error, count });
  }
}

// Dédup mémoire pour les points d'appel Algolia qui ont leur propre cache long (pages SEO
// avec ISR `revalidate`) : on ne compte qu'une fois par fenêtre et par clé, pour
// approximer le nombre d'appels réseau réels plutôt que le nombre de rendus.
const billingDedupCache = new MemoryCacheStore(256);

/**
 * Comme `recordAlgoliaQueries`, mais ne compte qu'une fois par `windowSeconds` pour une
 * `key` donnée (par instance serveur). Pour les pages SEO : leur `fetch` ISR ne touche
 * Algolia qu'une fois par fenêtre de revalidation, pas à chaque rendu.
 *
 * Approximation assumée : sur plusieurs instances Vercel, chacune compte une fois par
 * fenêtre -> léger sur-comptage. La réconciliation quotidienne avec l'API Usage d'Algolia
 * (Cloud Function) reste la source de vérité absolue ; ce compteur n'est qu'un
 * déclencheur d'alerte précoce. Voir ALGOLIA-QUOTA-FAILOVER.md §4.5.
 */
export async function recordAlgoliaQueriesOncePerWindow(
  key: string,
  windowSeconds: number,
  count = 1,
): Promise<void> {
  try {
    const dedupKey = `billed-once:${key}`;
    const already = await billingDedupCache.get<number>(dedupKey);
    if (already) return;
    await billingDedupCache.set(dedupKey, 1, windowSeconds);
  } catch {
    // cache indisponible -> on compte quand même (mieux vaut sur-compter que rater un pic)
  }
  await recordAlgoliaQueries(count);
}

/**
 * Moteur à utiliser pour la requête courante.
 *
 * Phase A : renvoie toujours "ALGOLIA" (`isQuotaEnforced()` faux). Phase C : "MEILISEARCH_ONLY"
 * avec hystérésis jusqu'à la fin de période une fois le softLimit franchi. Fail-open.
 */
export async function getSearchMode(): Promise<SearchMode> {
  if (!isQuotaEnforced()) return 'ALGOLIA';
  try {
    const status = await getQuotaStatus();
    if (status.mode === 'MEILISEARCH_ONLY') return 'MEILISEARCH_ONLY';
    if (status.overSoftLimit) {
      await switchToMeilisearch();
      return 'MEILISEARCH_ONLY';
    }
    return 'ALGOLIA';
  } catch (error) {
    logger.warn('getSearchMode a échoué — fail-open sur ALGOLIA', { error });
    return 'ALGOLIA';
  }
}

async function switchToMeilisearch(): Promise<void> {
  try {
    const { db, ref, Timestamp } = await getAdmin();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.mode === 'MEILISEARCH_ONLY') return;
      tx.update(ref, { mode: 'MEILISEARCH_ONLY', switchedAt: Timestamp.now() });
    });
    await invalidateQuotaStatusCache();
    logger.warn('Bascule automatique de la recherche vers Meilisearch (quota Algolia atteint)');
  } catch (error) {
    logger.error('Bascule vers Meilisearch impossible', { error });
  }
}
