import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { createCategoryListing, listCategoryListings } from "@/modules/category-listing/application/category-listing.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await listCategoryListings();
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les annonces multi-catégorie.",
      },
      500,
      auth.correlationId,
    );
  }
}

const bodySchema = z
  .object({
    categoryId: z.string().trim().min(1),
    announcerUid: z.string().trim().min(1),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(3000),
    price: z.coerce.number().positive(),
    province: z.string().trim().min(1),
    city: z.string().trim().min(2).max(80),
    images: z
      .array(
        z.object({
          fileURL: z.string().trim().min(1),
          filePATH: z.string().trim().min(1),
        }),
      )
      .min(1)
      .max(10),
    contact: z.string().trim().max(30).optional(),
    whatsappContact: z.string().trim().max(30).optional(),
    callContact: z.string().trim().max(30).optional(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  })
  .strict();

const ERROR_MAP: Record<string, { status: number; apiCode: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT"; message: string }> = {
  CATEGORY_LISTING_INVALID_CATEGORY: { status: 400, apiCode: "VALIDATION_ERROR", message: "Catégorie invalide." },
  CATEGORY_LISTING_CATEGORY_NOT_FOUND: { status: 404, apiCode: "NOT_FOUND", message: "Catégorie introuvable." },
  CATEGORY_LISTING_CATEGORY_IS_ROOT: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "Choisis une sous-catégorie (feuille), pas une catégorie racine.",
  },
  CATEGORY_LISTING_ROOT_NOT_FOUND: { status: 404, apiCode: "NOT_FOUND", message: "Catégorie racine introuvable." },
  CATEGORY_LISTING_INVALID_TITLE: { status: 400, apiCode: "VALIDATION_ERROR", message: "Titre invalide (3 à 120 caractères)." },
  CATEGORY_LISTING_INVALID_DESCRIPTION: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "Description invalide (10 à 3000 caractères).",
  },
  CATEGORY_LISTING_INVALID_PRICE: { status: 400, apiCode: "VALIDATION_ERROR", message: "Prix invalide." },
  CATEGORY_LISTING_IMAGES_REQUIRED: { status: 400, apiCode: "VALIDATION_ERROR", message: "Au moins une image est requise." },
  CATEGORY_LISTING_INVALID_CITY: { status: 400, apiCode: "VALIDATION_ERROR", message: "Ville invalide." },
  CATEGORY_LISTING_INVALID_PROVINCE: { status: 400, apiCode: "VALIDATION_ERROR", message: "Province invalide." },
  CATEGORY_LISTING_ANNOUNCER_NOT_FOUND: { status: 404, apiCode: "NOT_FOUND", message: "Annonceur introuvable." },
  CATEGORY_LISTING_ANNOUNCER_ROLE_REQUIRED: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "Le compte ciblé ne possède pas le rôle annonceur.",
  },
  CATEGORY_LISTING_CONTACT_REQUIRED: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "Aucun contact disponible (ni saisi, ni sur le profil annonceur).",
  },
};

function resolveError(code: string) {
  if (code.startsWith("ATTRIBUTE_REQUIRED:")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: `Champ requis manquant : ${code.split(":")[1]}.` };
  }
  if (code.startsWith("ATTRIBUTE_INVALID_TYPE:")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: `Type invalide pour l'attribut : ${code.split(":")[1]}.` };
  }
  if (code.startsWith("ATTRIBUTE_INVALID_OPTION:")) {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: `Valeur hors liste pour l'attribut : ${code.split(":")[1]}.` };
  }
  return (
    ERROR_MAP[code] ?? {
      status: 500,
      apiCode: "VALIDATION_ERROR" as const,
      message: "Impossible de créer cette annonce.",
    }
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
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

  try {
    const result = await createCategoryListing({
      ...parsed.data,
      actorUid: auth.admin.uid,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.create",
      resource: "property",
      resourceId: result.propertyId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        categoryId: result.categoryId,
        announcerUid: result.announcerUid,
        moderationStatus: result.moderationStatus,
      },
    });

    return jsonSuccess(result, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveError(code);
    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: {
          categoryListingErrorCode: code,
        },
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
