import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  deleteListing,
  getListingDetails,
  updateListing,
} from "@/modules/listing-management/application/listing-management.service";

const patchSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    typeProperty: z
      .enum([
        "Home",
        "Studio",
        "Apartment",
        "Desk",
        "Building",
        "Shop",
        "Kiosk",
        "Room",
        "Property",
        "Logement",
        "Villa",
        "Land",
      ])
      .optional(),
    status: z.enum(["FOR_RENT", "FOR_SALE"]).optional(),
    price: z.coerce.number().min(1).optional(),
    area: z.coerce.number().min(0).optional(),
    street: z.string().trim().min(1).max(180).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    province: z.string().trim().min(1).max(120).optional(),
    country: z.string().trim().min(1).max(80).optional(),
    countryCode: z.string().trim().min(2).max(4).optional(),
    contact: z.string().trim().max(60).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    isLocExact: z.boolean().optional(),
  })
  .strict();

const deleteBodySchema = z
  .object({
    reason: z.string().trim().min(10).max(500),
    confirmPropertyId: z.string().trim().min(1),
    confirmation: z.literal("SUPPRIMER"),
  })
  .strict();

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function buildFieldDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  patchedFields: string[],
) {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const field of patchedFields) {
    const beforeValue = before[field];
    const afterValue = after[field];
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }
    changes[field] = {
      before: beforeValue,
      after: afterValue,
    };
  }

  return changes;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const propertyId = params.propertyId?.trim();
  if (!propertyId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant annonce invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const listing = await getListingDetails(propertyId);
  if (!listing) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  return jsonSuccess({ listing }, auth.correlationId);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const propertyId = params.propertyId?.trim();
  if (!propertyId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant annonce invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const patchedFields = Object.keys(parsed.data);
  if (patchedFields.length === 0) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Aucun champ à mettre à jour.",
      },
      400,
      auth.correlationId,
    );
  }

  const includesStatus = patchedFields.includes("status");
  const includesNonStatusField = patchedFields.some((field) => field !== "status");

  if (includesNonStatusField && !hasPermission(auth.admin.permissions, "listings.update")) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Permission manquante : listings.update",
      },
      403,
      auth.correlationId,
    );
  }

  if (includesStatus && !hasPermission(auth.admin.permissions, "listings.status.update")) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Permission manquante : listings.status.update",
      },
      403,
      auth.correlationId,
    );
  }

  try {
    const mutation = await updateListing({
      propertyId,
      actorUid: auth.admin.uid,
      patch: parsed.data,
    });

    if (!mutation) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Annonce introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    const diff = buildFieldDiff(
      mutation.before as unknown as Record<string, unknown>,
      mutation.after as unknown as Record<string, unknown>,
      patchedFields,
    );

    const auditAction = includesStatus && !includesNonStatusField
      ? "listings.status.update"
      : "listings.update";

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: auditAction,
      resource: "property",
      resourceId: propertyId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        patchedFields,
      },
      diff: {
        fields: diff,
        beforeState: mutation.before.state,
        afterState: mutation.after.state,
        beforeStatus: mutation.before.status,
        afterStatus: mutation.after.status,
      },
    });

    return jsonSuccess({ listing: mutation.after }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de mettre à jour l'annonce.",
      },
      500,
      auth.correlationId,
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "listings.delete.hard");
  if (!auth.ok) {
    return auth.response;
  }

  if (!auth.admin.roles.includes("super_admin")) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Seul le super_admin peut supprimer définitivement une annonce.",
      },
      403,
      auth.correlationId,
    );
  }

  const params = await context.params;
  const propertyId = params.propertyId?.trim();
  if (!propertyId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Identifiant annonce invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  if (parsed.data.confirmPropertyId.trim() !== propertyId) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Confirmation invalide : confirmPropertyId doit correspondre à l'annonce ciblée.",
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const deleted = await deleteListing(propertyId);
    if (!deleted) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Annonce introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.delete.hard",
      resource: "property",
      resourceId: propertyId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        reason: parsed.data.reason,
      },
      diff: {
        before: {
          id: deleted.id,
          title: deleted.title,
          status: deleted.status,
          state: deleted.state,
          createdBy: deleted.createdBy,
          price: deleted.price,
          city: deleted.city,
          province: deleted.province,
        },
        after: null,
      },
    });

    return jsonSuccess(
      {
        deleted: true,
        listing: {
          id: deleted.id,
          title: deleted.title,
        },
      },
      auth.correlationId,
    );
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer définitivement cette annonce.",
      },
      500,
      auth.correlationId,
    );
  }
}
