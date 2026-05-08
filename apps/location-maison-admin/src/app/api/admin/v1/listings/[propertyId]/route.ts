import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  deleteListing,
  getListingDetails,
  recordListingModerationDecision,
  updateListing,
} from "@/modules/listing-management/application/listing-management.service";
import type { UpdateListingInput } from "@/modules/listing-management/domain/types";
import {
  listingFullSchema,
  listingPatchSchema,
  normalizeImages,
} from "@/modules/listing-management/presentation/listing-validation";

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

type ListingPatchPayload = z.infer<typeof listingPatchSchema>;

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

function toFullListingPayload(
  listing: NonNullable<Awaited<ReturnType<typeof getListingDetails>>>,
) {
  return {
    title: listing.title,
    description: listing.description,
    typeProperty: listing.typeProperty ?? "Property",
    status: listing.status ?? "FOR_RENT",
    price: listing.price ?? 1,
    area: listing.area ?? 0,
    tags: listing.tags,
    images: listing.images,
    street: listing.street ?? "N/A",
    city: listing.city ?? "N/A",
    province: listing.province ?? "N/A",
    provinceLon: listing.provinceLon ?? undefined,
    provinceLat: listing.provinceLat ?? undefined,
    cityLon: listing.cityLon ?? undefined,
    cityLat: listing.cityLat ?? undefined,
    streetLon: listing.streetLon ?? undefined,
    streetLat: listing.streetLat ?? undefined,
    additionnalInformation: listing.additionnalInformation ?? undefined,
    longitude: listing.longitude ?? undefined,
    latitude: listing.latitude ?? undefined,
    country: listing.country ?? "N/A",
    countryCode: listing.countryCode ?? "GA",
    isLocExact: listing.isLocExact ?? undefined,
    contact: listing.contact ?? undefined,
    nbrRooms: listing.nbrRooms ?? undefined,
    nbrKitchens: listing.nbrKitchens ?? undefined,
    nbrBathrooms: listing.nbrBathrooms ?? undefined,
    nbrToilets: listing.nbrToilets ?? undefined,
    nbrGarages: listing.nbrGarages ?? undefined,
    nbrFloors: listing.nbrFloors ?? undefined,
    nbrLivingRoom: listing.nbrLivingRoom ?? undefined,
    nbrFloorStudio: listing.nbrFloorStudio ?? undefined,
    numeroStudio: listing.numeroStudio ?? undefined,
    nbrFloorApartment: listing.nbrFloorApartment ?? undefined,
    numeroApartment: listing.numeroApartment ?? undefined,
    nbrPiscine: listing.nbrPiscine ?? undefined,
    nbrApartments: listing.nbrApartments ?? undefined,
    hasParking: listing.hasParking ?? undefined,
    nbrToilet: listing.nbrToilet ?? undefined,
    kioskType: listing.kioskType ?? undefined,
    roomType: listing.roomType ?? undefined,
  };
}

function normalizePatchPayload(
  input: ListingPatchPayload,
): UpdateListingInput["patch"] {
  const patch: Record<string, unknown> = { ...input };
  delete patch.reason;

  if (Array.isArray(patch.images)) {
    patch.images = normalizeImages(
      patch.images as Array<string | { fileURL: string; filePATH?: string }>,
    );
  }

  return patch as UpdateListingInput["patch"];
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
  const parsed = listingPatchSchema.safeParse(body);
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

  const reason = parsed.data.reason?.trim() || null;
  const patchPayload = normalizePatchPayload(parsed.data);
  const patchedFields = Object.keys(patchPayload);

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

  if (includesStatus && !reason) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Un motif est obligatoire pour changer le statut d'une annonce.",
      },
      400,
      auth.correlationId,
    );
  }

  const existing = await getListingDetails(propertyId);
  if (!existing) {
    return jsonError(
      {
        code: "NOT_FOUND",
        message: "Annonce introuvable.",
      },
      404,
      auth.correlationId,
    );
  }

  const mergedCandidate = {
    ...toFullListingPayload(existing),
    ...patchPayload,
  };
  const mergedValidation = listingFullSchema.safeParse(mergedCandidate);

  if (!mergedValidation.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "La mise à jour viole les règles métier de l'annonce.",
        details: {
          issues: mergedValidation.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const mutation = await updateListing({
      propertyId,
      actorUid: auth.admin.uid,
      patch: patchPayload,
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
        reason,
      },
      diff: {
        fields: diff,
        beforeState: mutation.before.state,
        afterState: mutation.after.state,
        beforeStatus: mutation.before.status,
        afterStatus: mutation.after.status,
      },
    });

    if (includesStatus && mutation.before.status !== mutation.after.status && reason) {
      await recordListingModerationDecision({
        propertyId,
        decision: "STATUS_CHANGE",
        reason,
        beforeState: mutation.before.state,
        afterState: mutation.after.state,
        beforeStatus: mutation.before.status,
        afterStatus: mutation.after.status,
        actorId: auth.admin.uid,
        actorRoles: auth.admin.roles,
        correlationId: auth.correlationId,
      });
    }

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
        deletedPropertyId: propertyId,
        deletedBy: auth.admin.uid,
      },
    });

    return jsonSuccess(
      {
        propertyId,
        deleted: true,
      },
      auth.correlationId,
    );
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de supprimer l'annonce.",
      },
      500,
      auth.correlationId,
    );
  }
}
