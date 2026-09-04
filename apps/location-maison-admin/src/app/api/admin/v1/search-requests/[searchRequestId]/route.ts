import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { TypePropertyEnum } from "@trouve-ton-nkama/core/domain";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { toGabonWhatsappE164 } from "@/lib/phone/gabon-whatsapp";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  deleteSearchRequest,
  getSearchRequestById,
  setSearchRequestState,
  updateSearchRequestContent,
} from "@/modules/search-requests-moderation/infrastructure/search-requests.repository";

type RouteContext = {
  params: Promise<{ searchRequestId: string }>;
};

const SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH = 1000;

const statePatchSchema = z.object({ state: z.enum(["IN_PROGRESS", "ARCHIVED"]) }).strict();

// Tous les champs sont optionnels : un modérateur ne corrige souvent qu'un seul champ (ex.
// le budget d'une demande dictée par téléphone/WhatsApp). Le PATCH final est validé contre
// le document existant fusionné, pas contre les seuls champs envoyés — voir plus bas.
const contentPatchSchema = z
  .object({
    typeProperty: z.enum(Object.keys(TypePropertyEnum) as [string, ...string[]]).optional(),
    transactionType: z.enum(["FOR_RENT", "FOR_SALE"]).optional(),
    province: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1).optional(),
    neighborhood: z.string().trim().max(120).nullable().optional(),
    budgetMinXaf: z.coerce.number().int().min(0).optional(),
    budgetMaxXaf: z.coerce.number().int().min(1).optional(),
    description: z.string().trim().min(10).max(SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH).optional(),
    whatsappContact: z.string().trim().min(6).max(20).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Aucun champ à modifier." });

/**
 * Deux opérations distinctes partagent cette route, différenciées par la forme du corps :
 * - `{ state }` : archivage / désarchivage (comportement historique, inchangé).
 * - tout autre champ (typeProperty, budgetMinXaf, description...) : correction du contenu de
 *   la demande — ex. un budget mal interprété depuis un message WhatsApp ("150 000" saisi
 *   comme min ET max au lieu de max seul, budgetMinXaf=0 implicite). Permission distincte
 *   (`search_requests.update`) : un modérateur peut archiver sans pouvoir réécrire le
 *   contenu d'une demande, et inversement.
 *
 * Archiver retire la demande du site public (la liste publique filtre sur
 * `state == "IN_PROGRESS"`) sans rien détruire : réversible, contrairement à DELETE.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { searchRequestId } = await context.params;
  const id = searchRequestId?.trim();
  if (!id) {
    return jsonError({ code: "VALIDATION_ERROR", message: "Identifiant invalide." }, 400, auth.correlationId);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonError({ code: "VALIDATION_ERROR", message: "Corps de requête invalide." }, 400, auth.correlationId);
  }

  if ("state" in body) {
    if (!hasPermission(auth.admin.permissions, "search_requests.archive")) {
      return jsonError(
        { code: "FORBIDDEN", message: "Permission manquante : search_requests.archive" },
        403,
        auth.correlationId,
      );
    }

    const parsed = statePatchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        { code: "VALIDATION_ERROR", message: "Corps de requête invalide.", details: { issues: parsed.error.issues } },
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
        { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Impossible de modifier la demande." },
        500,
        auth.correlationId,
      );
    }
  }

  // Correction du contenu.
  if (!hasPermission(auth.admin.permissions, "search_requests.update")) {
    return jsonError(
      { code: "FORBIDDEN", message: "Permission manquante : search_requests.update" },
      403,
      auth.correlationId,
    );
  }

  const parsed = contentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Corps de requête invalide.", details: { issues: parsed.error.issues } },
      400,
      auth.correlationId,
    );
  }

  try {
    const existing = await getSearchRequestById(id);
    if (!existing) {
      return jsonError({ code: "NOT_FOUND", message: "Demande introuvable." }, 404, auth.correlationId);
    }

    // Fusionné puis validé dans son ensemble — pas seulement les champs envoyés — pour ne
    // jamais laisser passer une combinaison invalide (ex. ne changer que le budget max à une
    // valeur inférieure au min existant, chacun valide isolément mais incohérent ensemble).
    const merged = {
      typeProperty: parsed.data.typeProperty ?? existing.typeProperty,
      transactionType: parsed.data.transactionType ?? existing.transactionType,
      province: parsed.data.province ?? existing.province,
      city: parsed.data.city ?? existing.city,
      neighborhood: parsed.data.neighborhood !== undefined ? parsed.data.neighborhood : existing.neighborhood,
      budgetMinXaf: parsed.data.budgetMinXaf ?? existing.budgetMinXaf,
      budgetMaxXaf: parsed.data.budgetMaxXaf ?? existing.budgetMaxXaf,
      description: parsed.data.description ?? existing.description,
      // Format +241... — demande explicite de l'utilisateur. Normalisé seulement si un
      // nouveau numéro est envoyé ; sinon la valeur existante (déjà normalisée à la création
      // ou lors d'une édition précédente) est conservée telle quelle.
      whatsappContact:
        parsed.data.whatsappContact !== undefined
          ? toGabonWhatsappE164(parsed.data.whatsappContact)
          : existing.whatsappContact,
    };

    if (merged.budgetMinXaf > merged.budgetMaxXaf) {
      return jsonError(
        { code: "VALIDATION_ERROR", message: "Le budget minimum doit être inférieur ou égal au budget maximum." },
        400,
        auth.correlationId,
      );
    }

    await updateSearchRequestContent(id, merged, auth.admin.uid);

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "search_requests.update",
      resource: "search_request",
      resourceId: id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { before: existing, after: merged },
    });

    return jsonSuccess({ id, ...merged }, auth.correlationId);
  } catch (error) {
    return jsonError(
      { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Impossible de modifier la demande." },
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
