import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  deleteSearchRequest,
  getSearchRequestById,
  setSearchRequestState,
} from "@/modules/search-requests-moderation/infrastructure/search-requests.repository";

type RouteContext = {
  params: Promise<{ searchRequestId: string }>;
};

const patchBodySchema = z.object({ state: z.enum(["IN_PROGRESS", "ARCHIVED"]) }).strict();

/**
 * Archivage / désarchivage d'une demande publiée.
 *
 * Archiver la retire du site public (la liste publique filtre sur
 * `state == "IN_PROGRESS"`) sans rien détruire : l'opération est réversible et
 * conserve l'historique, contrairement à DELETE.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPermission(auth.admin.permissions, "search_requests.archive")) {
    return jsonError(
      { code: "FORBIDDEN", message: "Permission manquante : search_requests.archive" },
      403,
      auth.correlationId,
    );
  }

  const { searchRequestId } = await context.params;
  const id = searchRequestId?.trim();
  if (!id) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Identifiant invalide." }, 400, auth.correlationId);
  }

  const body = await request.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(body);
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

  try {
    const existing = await getSearchRequestById(id);
    if (!existing) {
      return jsonError({ code: "NOT_FOUND", message: "Demande introuvable." }, 404, auth.correlationId);
    }

    await setSearchRequestState(id, parsed.data.state, auth.admin.uid);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: parsed.data.state === "ARCHIVED" ? "search_requests.archive" : "search_requests.unarchive",
      resource: "search_request",
      resourceId: id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { beforeState: existing.state, afterState: parsed.data.state },
    });

    return jsonSuccess({ id, state: parsed.data.state }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de modifier la demande.",
      },
      500,
      auth.correlationId,
    );
  }
}

/**
 * Suppression définitive. Irréversible, d'où une permission distincte de
 * l'archivage : un modérateur peut archiver, pas supprimer.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPermission(auth.admin.permissions, "search_requests.delete")) {
    return jsonError(
      { code: "FORBIDDEN", message: "Permission manquante : search_requests.delete" },
      403,
      auth.correlationId,
    );
  }

  const { searchRequestId } = await context.params;
  const id = searchRequestId?.trim();
  if (!id) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Identifiant invalide." }, 400, auth.correlationId);
  }

  try {
    const existing = await getSearchRequestById(id);
    if (!existing) {
      return jsonError({ code: "NOT_FOUND", message: "Demande introuvable." }, 404, auth.correlationId);
    }

    await deleteSearchRequest(id);

    // Trace complète avant disparition : le document n'existera plus, l'audit
    // est la seule mémoire de ce qui a été supprimé.
    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "search_requests.delete",
      resource: "search_request",
      resourceId: id,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        city: existing.city,
        typeProperty: existing.typeProperty,
        whatsappContact: existing.whatsappContact,
        source: existing.source,
      },
    });

    return jsonSuccess({ id, deleted: true }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de supprimer la demande.",
      },
      500,
      auth.correlationId,
    );
  }
}
