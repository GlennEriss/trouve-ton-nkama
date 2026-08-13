import { NextRequest } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import { TypePropertyEnum } from "@trouve-ton-nkama/core/domain";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listApprovedSearchRequests } from "@/modules/search-requests-moderation/infrastructure/search-requests.repository";

/**
 * Création d'une demande de recherche par un admin, pour le compte d'un tiers
 * (ex. quelqu'un qui appelle ou passe en agence).
 *
 * Différences assumées avec le formulaire public :
 * - aucun paiement : `paymentStatus = "not_required"` et `amountPaidXaf = 0`.
 *   On ne réutilise pas "confirmed" avec un montant nul, qui laisserait croire à
 *   un paiement encaissé et fausserait tout reporting de revenu.
 * - publication directe : `moderationStatus = "APPROVED"`. Faire passer par la
 *   file de modération une demande saisie par l'admin lui-même n'a pas de sens.
 * - `boostUntilDays` optionnel : l'admin peut mettre en avant sans facturer ;
 *   la fenêtre démarre immédiatement puisque la demande est publiée d'emblée.
 */

const SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH = 1000;
const BOOST_DURATION_DAYS = 7;

const bodySchema = z
  .object({
    typeProperty: z.enum(Object.keys(TypePropertyEnum) as [string, ...string[]]),
    transactionType: z.enum(["FOR_RENT", "FOR_SALE"]),
    province: z.string().trim().min(1),
    city: z.string().trim().min(1),
    neighborhood: z.string().trim().max(120).optional(),
    budgetMinXaf: z.coerce.number().int().min(0),
    budgetMaxXaf: z.coerce.number().int().min(1),
    description: z.string().trim().min(10).max(SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH),
    whatsappContact: z.string().trim().min(6).max(20),
    boosted: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.budgetMinXaf <= value.budgetMaxXaf, {
    message: "Le budget minimum doit être inférieur ou égal au budget maximum.",
    path: ["budgetMinXaf"],
  });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  // Publier directement équivaut à approuver : on exige la même permission.
  if (!hasPermission(auth.admin.permissions, "search_requests.approve")) {
    return jsonError(
      { code: "FORBIDDEN", message: "Permission manquante : search_requests.approve" },
      403,
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

  const input = parsed.data;

  try {
    const db = getFirebaseAdminDb();
    const docRef = db.collection(COLLECTIONS.search_requests).doc();

    const now = Timestamp.now();
    const boostEndAt = input.boosted
      ? Timestamp.fromMillis(now.toMillis() + BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000)
      : null;

    await docRef.set({
      id: docRef.id,
      typeProperty: input.typeProperty,
      transactionType: input.transactionType,
      province: input.province,
      city: input.city,
      neighborhood: input.neighborhood ?? null,
      budgetMinXaf: input.budgetMinXaf,
      budgetMaxXaf: input.budgetMaxXaf,
      description: input.description,
      whatsappContact: input.whatsappContact,

      source: "admin",
      createdByAdmin: auth.admin.uid,

      paymentStatus: "not_required",
      amountPaidXaf: 0,

      boostRequested: Boolean(input.boosted),
      boostPaid: Boolean(input.boosted),
      boostStartAt: input.boosted ? now : null,
      boostEndAt,

      moderationStatus: "APPROVED",
      rejectionReason: null,
      moderationReviewedAt: now,
      moderationReviewedBy: auth.admin.uid,

      state: "IN_PROGRESS",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "search_requests.create",
      resource: "search_request",
      resourceId: docRef.id,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        source: "admin",
        city: input.city,
        typeProperty: input.typeProperty,
        boosted: Boolean(input.boosted),
      },
    });

    return jsonSuccess({ id: docRef.id }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de créer la demande.",
      },
      500,
      auth.correlationId,
    );
  }
}

const listQuerySchema = z.object({
  state: z.enum(["IN_PROGRESS", "ARCHIVED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
});

/** Liste les demandes déjà approuvées : publiées (IN_PROGRESS) ou archivées. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPermission(auth.admin.permissions, "search_requests.read")) {
    return jsonError(
      { code: "FORBIDDEN", message: "Permission manquante : search_requests.read" },
      403,
      auth.correlationId,
    );
  }

  const parsed = listQuerySchema.safeParse({
    state: request.nextUrl.searchParams.get("state") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: { issues: parsed.error.issues },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await listApprovedSearchRequests({
      limit: parsed.data.limit ?? 20,
      cursor: parsed.data.cursor,
      state: parsed.data.state ?? "IN_PROGRESS",
    });
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les demandes.",
      },
      500,
      auth.correlationId,
    );
  }
}
