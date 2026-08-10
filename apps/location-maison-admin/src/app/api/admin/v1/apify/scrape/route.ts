import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { triggerFacebookGroupsRun } from "@/modules/apify/infrastructure/apify-client";

export const runtime = "nodejs";

const MAX_GROUP_URLS = 10;
const DEFAULT_RESULTS_LIMIT = 100;
const MAX_RESULTS_LIMIT = 500;
const GROUP_URL_RE = /^https:\/\/www\.facebook\.com\/groups\//;

/**
 * Kicks off a Facebook Groups Scraper run on Apify — the automated
 * replacement for "run it on console.apify.com, export, paste the JSON"
 * (see `apify/import/route.ts` for what happens to the result once pasted).
 * Fire-and-return: the run keeps going on Apify's side, the client polls
 * `GET .../scrape/[runId]` for completion.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as {
    groupUrls?: unknown;
    resultsLimit?: unknown;
  } | null;

  const groupUrls = Array.isArray(body?.groupUrls)
    ? (body.groupUrls as unknown[])
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean)
    : [];

  if (groupUrls.length === 0 || groupUrls.length > MAX_GROUP_URLS) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: `Fournir entre 1 et ${MAX_GROUP_URLS} URLs de groupe.` },
      400,
      auth.correlationId,
    );
  }
  const invalidUrl = groupUrls.find((url) => !GROUP_URL_RE.test(url));
  if (invalidUrl) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: `URL de groupe invalide : ${invalidUrl}` },
      400,
      auth.correlationId,
    );
  }

  const resultsLimit =
    typeof body?.resultsLimit === "number" && Number.isFinite(body.resultsLimit) && body.resultsLimit > 0
      ? Math.min(Math.floor(body.resultsLimit), MAX_RESULTS_LIMIT)
      : DEFAULT_RESULTS_LIMIT;

  try {
    const { runId, datasetId } = await triggerFacebookGroupsRun(groupUrls, resultsLimit);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "apify.scrape.trigger",
      resource: "apify_scrape",
      resourceId: runId,
      status: "success",
      correlationId: auth.correlationId,
      details: { groupUrls, resultsLimit, datasetId },
    });

    return jsonSuccess({ runId, datasetId }, auth.correlationId, 201);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Échec du déclenchement du scraping.";
    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "apify.scrape.trigger",
      resource: "apify_scrape",
      status: "failed",
      correlationId: auth.correlationId,
      details: { groupUrls, resultsLimit, error: message },
    });
    return jsonError({ code: "INTERNAL_ERROR", message }, 502, auth.correlationId);
  }
}
