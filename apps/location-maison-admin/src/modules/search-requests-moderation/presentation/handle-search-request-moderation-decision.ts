import { NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  updateSearchRequestModerationStatus,
  type ModerationDecision,
} from "@/modules/search-requests-moderation/application/search-requests-moderation.service";

/**
 * Logique partagée entre les routes approve/reject — mirror du contrat de
 * handle-reel-moderation-decision.ts. Permissions dédiées search_requests.* (pas
 * un réemprunt de listings.*) : contrairement aux réels (rattachés à une annonce
 * déjà modérée), une demande de recherche est un type de contenu distinct
 * soumis anonymement, un modérateur scopé aux annonces ne doit pas
 * automatiquement hériter de ce pouvoir.
 */
export async function handleSearchRequestModerationDecision(
  request: NextRequest,
  searchRequestId: string | undefined,
  decision: ModerationDecision,
  bodySchema: ZodTypeAny,
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const requiredPermission = decision === "APPROVE" ? "search_requests.approve" : "search_requests.reject";
  if (!hasPermission(auth.admin.permissions, requiredPermission)) {
    return jsonError(
      { code: "FORBIDDEN", message: `Permission manquante : ${requiredPermission}` },
      403,
      auth.correlationId,
    );
  }

  const trimmedId = searchRequestId?.trim();
  if (!trimmedId) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Identifiant de demande invalide." },
      400,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: { issues: parsed.error.issues },
      },
      400,
      auth.correlationId,
    );
  }

  const reason = (parsed.data as { reason?: string }).reason;

  try {
    const mutation = await updateSearchRequestModerationStatus({
      searchRequestId: trimmedId,
      actorUid: auth.admin.uid,
      decision,
      reason,
    });

    if (!mutation) {
      return jsonError({ code: "NOT_FOUND", message: "Demande introuvable." }, 404, auth.correlationId);
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: decision === "APPROVE" ? "search_requests.approve" : "search_requests.reject",
      resource: "search_request",
      resourceId: trimmedId,
      status: "success",
      correlationId: auth.correlationId,
      details: { reason: reason?.trim() || (decision === "APPROVE" ? "Approuvé sans motif" : "") },
      diff: {
        beforeModerationStatus: mutation.before.moderationStatus,
        afterModerationStatus: mutation.after.moderationStatus,
      },
    });

    return jsonSuccess({ searchRequest: mutation.after }, auth.correlationId);
  } catch (error) {
    if (error instanceof Error && error.message === "SEARCH_REQUEST_NOT_PENDING") {
      return jsonError(
        { code: "CONFLICT", message: "Cette demande a déjà été traitée (déjà approuvée ou rejetée)." },
        409,
        auth.correlationId,
      );
    }
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de traiter la demande.",
      },
      500,
      auth.correlationId,
    );
  }
}

export const approveBodySchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();
export const rejectBodySchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
