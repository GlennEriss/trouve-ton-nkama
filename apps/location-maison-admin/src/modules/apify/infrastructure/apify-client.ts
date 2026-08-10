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

// Account-level errors worth retrying with the next token. Anything else
// (400 bad input, 404 unknown actor/run, 5xx) would fail identically on
// every token, so it's surfaced immediately instead of retried 5 times.
const FAILOVER_STATUSES = new Set([401, 402, 429]);

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
 * Try `attempt` with each token in `pool`, in order. Advances to the next
 * token only on a 401/402/429 (account-level: revoked/exhausted/rate
 * limited). Any other error — including a 404 "run not found", which for
 * `getRunStatus`/`getDatasetItems` just means "wrong account for this
 * run/dataset ID" — is also treated as failover-worthy here, since the
 * caller has no other way to know which account owns a given run.
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
      const retryable = status !== null && (FAILOVER_STATUSES.has(status) || status === 404);
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
