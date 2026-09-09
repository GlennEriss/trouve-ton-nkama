import '../node/slow-buffer-compat';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';

import { adminDB } from '../admin';
import {
  alertThreshold,
  billingPeriodKey,
  billingPeriodRange,
  isPeriodStale,
  monthlyQuota,
  softLimit,
} from './algolia-billing-period';

/**
 * Surveillance quotidienne du quota de recherche Algolia (cycle du 9 au 8). Fait le pendant
 * « planifié » de ce que le proxy `/api/algolia/search` alimente en continu :
 *
 *  1. Remet le compteur à zéro si la période de facturation a changé (filet si aucun trafic
 *     ne l'a déclenché lazily le 9).
 *  2. Réconcilie le compteur avec le chiffre réel d'Algolia via l'API Usage, si une clé
 *     `ALGOLIA_USAGE_API_KEY` est configurée (sinon on garde le compteur proxy, minorant).
 *  3. Envoie une alerte (log structuré + e-mail) au franchissement du seuil (~80 %), au plus
 *     une fois par 24 h.
 *
 * Voir docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md §4.4 et §4.5.
 */

const QUOTA_COLLECTION = 'system_config';
const QUOTA_DOC_ID = 'algolia-quota';

const DEFAULT_SCHEDULE = '15 0 * * *'; // tous les jours à 00:15 UTC
const DEFAULT_TIME_ZONE = 'UTC'; // le cycle Algolia est ancré en UTC (à confirmer dashboard)
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface QuotaDocData {
  periodKey?: string;
  count?: number;
  limit?: number;
  softLimit?: number;
  alertAt?: number;
  mode?: 'ALGOLIA' | 'MEILISEARCH_ONLY';
  switchedAt?: Timestamp | null;
  lastAlertAt?: Timestamp | null;
  lastReconciledAt?: Timestamp | null;
}

function quotaDocRef() {
  return adminDB.collection(QUOTA_COLLECTION).doc(QUOTA_DOC_ID);
}

/** Écrit un document « période fraîche » (compteur 0, mode Algolia). */
function freshDocData(periodKey: string): QuotaDocData {
  return {
    periodKey,
    count: 0,
    limit: monthlyQuota(),
    softLimit: softLimit(),
    alertAt: alertThreshold(),
    mode: 'ALGOLIA',
    switchedAt: null,
    lastAlertAt: null,
    lastReconciledAt: null,
  };
}

/**
 * Interroge l'API Usage d'Algolia pour le nombre de `search_operations` de la période
 * courante. Retourne `null` si non configuré ou en cas d'échec (on garde alors le compteur
 * proxy). Format de réponse traité de façon défensive : `{ <statistic>: [{ t, v }] }`.
 */
async function fetchAlgoliaUsageForPeriod(periodStart: Date, periodEnd: Date): Promise<number | null> {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || process.env.ALGOLIA_APP_ID;
  const usageKey = process.env.ALGOLIA_USAGE_API_KEY;
  if (!appId || !usageKey) {
    return null;
  }

  const startDate = periodStart.toISOString().slice(0, 10);
  const endDate = new Date(Math.min(periodEnd.getTime(), Date.now())).toISOString().slice(0, 10);
  const url = `https://usage.algolia.com/1/usage/search_operations?startDate=${startDate}&endDate=${endDate}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Algolia-Application-Id': appId,
        'X-Algolia-API-Key': usageKey,
      },
    });
    if (!res.ok) {
      functions.logger.warn('Algolia Usage API non disponible', { status: res.status });
      return null;
    }
    const body = (await res.json()) as Record<string, Array<{ t?: number; v?: number }>>;
    const series = body.search_operations ?? body['search_operations'];
    if (!Array.isArray(series)) {
      return null;
    }
    const total = series.reduce((sum, point) => sum + (Number.isFinite(point.v) ? Number(point.v) : 0), 0);
    return Number.isFinite(total) ? total : null;
  } catch (error) {
    functions.logger.warn('Appel API Usage Algolia échoué', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function sendAlertEmail(subject: string, text: string): Promise<void> {
  const emailUser = process.env.HOSTINGER_EMAIL_USER;
  const emailPass = process.env.HOSTINGER_EMAIL_PASS;
  const displayName = process.env.EMAIL_DISPLAY_NAME || 'Trouve Ton Nkama';
  const to = process.env.SEARCH_QUOTA_ALERT_EMAIL || 'contact@tonnkama.com';

  if (!emailUser || !emailPass) {
    functions.logger.warn('Alerte quota : secrets e-mail absents, envoi ignoré (le log structuré reste).');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPass },
  });

  await transporter.sendMail({
    from: `"${displayName}" <${emailUser}>`,
    to,
    subject,
    text,
  });
}

export const monitorAlgoliaSearchQuota = onSchedule(
  {
    schedule: process.env.ALGOLIA_QUOTA_MONITOR_SCHEDULE?.trim() || DEFAULT_SCHEDULE,
    timeZone: process.env.ALGOLIA_QUOTA_MONITOR_TIMEZONE?.trim() || DEFAULT_TIME_ZONE,
    timeoutSeconds: 120,
    memory: '256MiB',
    retryCount: 1,
    // Pas de `secrets: [...]` ici :
    //  - HOSTINGER_EMAIL_USER / HOSTINGER_EMAIL_PASS / EMAIL_DISPLAY_NAME sont déjà fournis
    //    en clair par functions/.env (les déclarer aussi comme secrets fait échouer le
    //    déploiement : « Secret environment variable overlaps non secret environment
    //    variable »). Si absents, `sendAlertEmail` se contente du log structuré.
    //  - ALGOLIA_USAGE_API_KEY : à ajouter (secret ou .env) quand la clé sera obtenue ;
    //    sans elle, la réconciliation API Usage est simplement désactivée.
  },
  async () => {
    const now = new Date();
    const currentPeriod = billingPeriodKey(now);
    const range = billingPeriodRange(currentPeriod);
    const ref = quotaDocRef();

    // --- 1. Remise à zéro si la période a changé -------------------------------------
    const didReset = await adminDB.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.exists ? snap.data() : undefined) as QuotaDocData | undefined;
      if (!snap.exists || isPeriodStale(data?.periodKey, now)) {
        tx.set(ref, { ...freshDocData(currentPeriod), updatedAt: FieldValue.serverTimestamp() });
        return true;
      }
      return false;
    });

    if (didReset) {
      functions.logger.info('Compteur de quota Algolia remis à zéro (nouvelle période).', {
        periodKey: currentPeriod,
        periodLabel: range.label,
      });
    }

    // --- 2. Réconciliation avec l'API Usage Algolia ---------------------------------
    const realUsage = await fetchAlgoliaUsageForPeriod(range.start, range.end);
    if (realUsage !== null) {
      await ref.set(
        {
          count: realUsage,
          limit: monthlyQuota(),
          softLimit: softLimit(),
          alertAt: alertThreshold(),
          lastReconciledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      functions.logger.info('Compteur de quota Algolia réconcilié avec l\'API Usage.', {
        periodKey: currentPeriod,
        count: realUsage,
      });
    }

    // --- 3. Alerte au franchissement du seuil --------------------------------------
    const snap = await ref.get();
    const data = (snap.exists ? snap.data() : freshDocData(currentPeriod)) as QuotaDocData;
    const count = Number(data.count ?? 0);
    const threshold = Number(data.alertAt ?? alertThreshold());
    const limit = Number(data.limit ?? monthlyQuota());
    const lastAlertMs = data.lastAlertAt instanceof Timestamp ? data.lastAlertAt.toMillis() : 0;
    const cooledDown = Date.now() - lastAlertMs > ALERT_COOLDOWN_MS;

    if (count >= threshold && cooledDown) {
      const pct = limit > 0 ? Math.round((count / limit) * 100) : 0;
      const source = realUsage !== null ? 'API Usage Algolia' : 'compteur proxy (minorant)';
      const overageBundles = Math.max(0, Math.ceil((count - limit) / 1000));
      const message =
        `Quota de recherche Algolia à ${pct}% (${count} / ${limit}) pour la période ${range.label}.\n` +
        `Source : ${source}.\n` +
        (count >= limit
          ? `⚠️ DÉPASSEMENT en cours : ~${overageBundles} tranche(s) de 1000 facturée(s) à 0,50 $.\n`
          : `Seuil de bascule (Meilisearch) : ${data.softLimit ?? softLimit()}.\n`) +
        `Détail : /admin/search-quota — docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md`;

      functions.logger.warn('Alerte quota de recherche Algolia', {
        periodKey: currentPeriod,
        count,
        limit,
        threshold,
        pct,
        source,
        overageBundles,
      });

      try {
        await sendAlertEmail(`[Trouve Ton Nkama] Quota Algolia à ${pct}%`, message);
      } catch (error) {
        functions.logger.error('Envoi de l\'e-mail d\'alerte quota échoué', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await ref.set({ lastAlertAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  },
);
