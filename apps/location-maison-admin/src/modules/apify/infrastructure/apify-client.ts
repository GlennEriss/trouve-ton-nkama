/**
 * Minimal Apify REST API client for the "Lancer le scraping" button in the
 * Apify module — triggers a Facebook Groups Scraper run and polls it,
 * replacing the manual "run on console.apify.com, export, paste JSON" loop.
 *
 * Unrelated to `apify-remote-download.ts` (that one works around fbcdn CDN
 * quirks — DoH, IP fallback, proxy — the Apify API itself is a plain
 * reliable HTTPS API, no such fallback needed here).
 *
 * Multi-account failover: the user rotates several free-tier Apify accounts.
 * `APIFY_API_TOKENS` holds all of them; every call tries each token in turn
 * and only advances to the next on an account-level error (401/402/429).
 * Deliberately stateless — a run's owning token is never persisted, each
 * poll/fetch call just retries the token pool again — so it survives
 * hitting a different serverless instance between requests.
 */

const API_BASE = "https://api.apify.com/v2";
const DEFAULT_ACTOR_ID = "apify~facebook-groups-scraper";

// Account-level errors worth retrying with the next token: jeton révoqué (401), quota mensuel
// épuisé (402 `not-enough-usage-to-run-paid-actor`), rate limit (429).
const FAILOVER_STATUSES = new Set([401, 402, 429]);

// Erreurs signifiant "cette ressource appartient à un autre compte du pool".
//
// 403 est le cas réel : relevé le 2026-08-18 sur les runs de production, Apify répond
// `403 insufficient-permissions` — et non 404 — quand on interroge /actor-runs/{id} avec le
// jeton d'un compte qui ne possède pas ce run. Son absence ici bloquait tout le suivi : le
// premier jeton du pool renvoyait 403, l'erreur n'était pas jugée réessayable, et la boucle
// s'arrêtait sans jamais atteindre le compte propriétaire. 404 est conservé par prudence.
const WRONG_ACCOUNT_STATUSES = new Set([403, 404]);

export type ApifyRunStatus = "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED-OUT" | "ABORTED" | "ABORTING";

class ApifyAccountCallError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApifyAccountCallError";
  }
}

export function getApifyTokenPool(): string[] {
  return (process.env.APIFY_API_TOKENS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function getActorId(): string {
  return process.env.APIFY_FACEBOOK_GROUPS_ACTOR_ID?.trim() || DEFAULT_ACTOR_ID;
}

/**
 * Try `attempt` with each token in `pool`, in order. Advances to the next token on deux
 * familles d'erreurs :
 *  - compte inutilisable (401/402/429) — on essaie le compte suivant ;
 *  - ressource appartenant à un autre compte (403/404) — le pool étant composé de comptes
 *    indépendants, l'appelant n'a aucun moyen de savoir lequel possède un run donné.
 *
 * Tout le reste (400 entrée invalide, 5xx côté Apify) échouerait à l'identique sur chaque
 * compte : on le remonte immédiatement plutôt que de le réessayer cinq fois.
 */
async function withTokenFailover<T>(pool: string[], attempt: (token: string) => Promise<T>): Promise<T> {
  if (pool.length === 0) {
    throw new Error("Aucun token Apify configuré (APIFY_API_TOKENS).");
  }

  const failures: string[] = [];
  for (let index = 0; index < pool.length; index += 1) {
    try {
      return await attempt(pool[index]);
    } catch (cause) {
      const status = cause instanceof ApifyAccountCallError ? cause.status : null;
      const retryable =
        status !== null && (FAILOVER_STATUSES.has(status) || WRONG_ACCOUNT_STATUSES.has(status));
      failures.push(`compte ${index + 1}: ${status ?? (cause instanceof Error ? cause.message : "échec")}`);
      if (!retryable) {
        throw cause;
      }
    }
  }

  throw new Error(`Tous les comptes Apify ont échoué (${pool.length}) — ${failures.join(" ; ")}`);
}

async function apifyRequest(path: string, token: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ApifyAccountCallError(response.status, body.slice(0, 300) || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function triggerFacebookGroupsRun(
  groupUrls: string[],
  resultsLimit: number,
): Promise<{ runId: string; datasetId: string }> {
  const pool = getApifyTokenPool();
  const actorId = getActorId();
  const input = {
    startUrls: groupUrls.map((url) => ({ url })),
    resultsLimit,
  };

  const data = (await withTokenFailover(pool, (token) =>
    apifyRequest(`/actors/${actorId}/runs`, token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  )) as { data: { id: string; defaultDatasetId: string } };

  return { runId: data.data.id, datasetId: data.data.defaultDatasetId };
}

export async function getRunStatus(runId: string): Promise<{ status: ApifyRunStatus; datasetId: string | null }> {
  const pool = getApifyTokenPool();
  const data = (await withTokenFailover(pool, (token) => apifyRequest(`/actor-runs/${runId}`, token))) as {
    data: { status: ApifyRunStatus; defaultDatasetId: string | null };
  };
  return { status: data.data.status, datasetId: data.data.defaultDatasetId };
}

export async function getDatasetItems(datasetId: string): Promise<unknown[]> {
  const pool = getApifyTokenPool();
  const items = await withTokenFailover(pool, (token) =>
    apifyRequest(`/datasets/${datasetId}/items?clean=true`, token),
  );
  return Array.isArray(items) ? items : [];
}
