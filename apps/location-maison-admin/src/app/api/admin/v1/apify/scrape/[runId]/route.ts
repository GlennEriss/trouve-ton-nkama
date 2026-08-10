import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { getDatasetItems, getRunStatus } from "@/modules/apify/infrastructure/apify-client";

export const runtime = "nodejs";

const TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED", "ABORTING"]);

type RouteContext = {
  params: Promise<{ runId: string }>;
};

/**
 * Polled by the dashboard while a run triggered via `POST .../scrape` is in
 * progress. Returns the raw dataset items once `SUCCEEDED`, ready to feed
 * straight into `runApifyPipeline` (same shape as a pasted Apify export).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const { runId } = await context.params;
  if (!runId?.trim()) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Run ID requis." }, 400, auth.correlationId);
  }

  try {
    const { status, datasetId } = await getRunStatus(runId.trim());

    if (!TERMINAL_STATUSES.has(status)) {
      return jsonSuccess({ status }, auth.correlationId);
    }

    if (status !== "SUCCEEDED") {
      return jsonSuccess({ status, error: `Le run Apify s'est terminé avec le statut ${status}.` }, auth.correlationId);
    }

    const items = datasetId ? await getDatasetItems(datasetId) : [];
    return jsonSuccess({ status, items }, auth.correlationId);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Échec de la vérification du run.";
    return jsonError({ code: "INTERNAL_ERROR", message }, 502, auth.correlationId);
  }
}
