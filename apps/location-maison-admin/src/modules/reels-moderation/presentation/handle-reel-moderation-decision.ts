import { NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  updateReelModerationStatus,
  type ModerationDecision,
} from "@/modules/reels-moderation/application/reels-moderation.service";

/**
 * Logique partagée entre les routes approve/reject — les deux routes ne diffèrent que par
 * `decision`, la permission requise et le schéma du corps de requête (reason optionnel vs
 * obligatoire), mirror du contrat des routes listings/.../moderation/{approve,reject}.
 */
export async function handleReelModerationDecision(
  request: NextRequest,
  reelId: string | undefined,
  decision: ModerationDecision,
  bodySchema: ZodTypeAny,
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  // Réutilise les permissions listings.approve/listings.reject (déjà accordées aux rôles
  // moderation_admin/operations_admin) plutôt que d'introduire une nouvelle dimension de
  // permission reels.* pour cette première étape — un admin habilité à modérer des annonces
  // est habilité à modérer les réels qui leur sont rattachés.
  const requiredPermission = decision === "APPROVE" ? "listings.approve" : "listings.reject";
  if (
    !hasPermission(auth.admin.permissions, requiredPermission) &&
    !hasPermission(auth.admin.permissions, "listings.state.update")
  ) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: `Permission manquante : ${requiredPermission} ou listings.state.update`,
      },
      403,
      auth.correlationId,
    );
  }

  const trimmedReelId = reelId?.trim();
  if (!trimmedReelId) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Identifiant réel invalide." },
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
    const mutation = await updateReelModerationStatus({
      reelId: trimmedReelId,
      actorUid: auth.admin.uid,
      decision,
      reason,
    });

    if (!mutation) {
      return jsonError({ code: "NOT_FOUND", message: "Réel introuvable." }, 404, auth.correlationId);
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: decision === "APPROVE" ? "reels.approve" : "reels.reject",
      resource: "reel",
      resourceId: trimmedReelId,
      status: "success",
      correlationId: auth.correlationId,
      details: { reason: reason?.trim() || (decision === "APPROVE" ? "Approuvé sans motif" : "") },
      diff: {
        beforeModerationStatus: mutation.before.moderationStatus,
        afterModerationStatus: mutation.after.moderationStatus,
      },
    });

    return jsonSuccess({ reel: mutation.after }, auth.correlationId);
  } catch (error) {
    if (error instanceof Error && error.message === "REEL_NOT_PENDING") {
      return jsonError(
        { code: "CONFLICT", message: "Ce réel a déjà été traité (déjà approuvé ou rejeté)." },
        409,
        auth.correlationId,
      );
    }
    if (error instanceof Error && error.message === "REEL_NOT_READY") {
      return jsonError(
        { code: "CONFLICT", message: "Ce réel n'a pas encore terminé son traitement vidéo." },
        409,
        auth.correlationId,
      );
    }
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de traiter le réel.",
      },
      500,
      auth.correlationId,
    );
  }
}

export const approveBodySchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();
export const rejectBodySchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
