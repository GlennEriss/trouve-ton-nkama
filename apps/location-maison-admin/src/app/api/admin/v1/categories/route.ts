import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { createCategory, listCategories } from "@/modules/category-management/application/category-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const attributeFieldSchema = z
  .object({
    key: z.string().trim().min(1).max(50),
    label: z.string().trim().min(1).max(80),
    type: z.enum(["text", "number", "enum", "boolean"]),
    options: z.array(z.string().trim().min(1)).max(50).optional(),
    required: z.boolean(),
    facetable: z.boolean(),
    searchable: z.boolean(),
    showOnCard: z.boolean(),
    primary: z.boolean(),
  })
  .strict();

const promotionPricingSchema = z
  .object({
    featured: z.object({ credits: z.number().int().min(0).max(1000), duration: z.number().int().min(0).max(90) }).optional(),
    "trending-7d": z.object({ credits: z.number().int().min(0).max(1000), duration: z.number().int().min(0).max(90) }).optional(),
    "trending-3d": z.object({ credits: z.number().int().min(0).max(1000), duration: z.number().int().min(0).max(90) }).optional(),
    boost: z.object({ credits: z.number().int().min(0).max(1000), duration: z.number().int().min(0).max(90) }).optional(),
  })
  .strict();

const bodySchema = z
  .object({
    parentId: z.string().trim().min(1).nullable(),
    slug: z.string().trim().min(2).max(60).optional(),
    name: z.string().trim().min(2).max(60),
    icon: z.string().trim().min(1).max(50).nullable().optional(),
    order: z.coerce.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
    attributeSchema: z.array(attributeFieldSchema).max(30).optional(),
    imageRatio: z.enum(["4:3", "1:1", "4:5"]).optional(),
    locationPrecision: z.enum(["exact", "city", "none"]).optional(),
    hasMapView: z.boolean().optional(),
    defaultDensity: z.enum(["showcase", "standard", "compact"]).optional(),
    defaultSort: z.string().trim().min(1).max(30).optional(),
    minListingsForHomeSection: z.coerce.number().int().min(0).max(10000).optional(),
    promotionPricing: promotionPricingSchema.optional(),
  })
  .strict();

const CREATE_ERROR_MAP: Record<string, { status: number; apiCode: "CONFLICT" | "VALIDATION_ERROR"; message: string }> = {
  CATEGORY_SLUG_ALREADY_EXISTS: { status: 409, apiCode: "CONFLICT", message: "Ce slug de catégorie existe déjà." },
  CATEGORY_PARENT_NOT_FOUND: { status: 400, apiCode: "VALIDATION_ERROR", message: "Catégorie parente introuvable." },
  CATEGORY_MAX_DEPTH_EXCEEDED: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "L'arbre des catégories est limité à 2 niveaux (racine puis feuille).",
  },
  CATEGORY_INVALID_NAME: { status: 400, apiCode: "VALIDATION_ERROR", message: "Nom de catégorie invalide." },
  CATEGORY_INVALID_ORDER: { status: 400, apiCode: "VALIDATION_ERROR", message: "Ordre invalide." },
  CATEGORY_INVALID_SLUG: { status: 400, apiCode: "VALIDATION_ERROR", message: "Slug invalide." },
  CATEGORY_INVALID_ATTRIBUTE_KEY: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "Clé d'attribut invalide (minuscules, chiffres, underscore, doit commencer par une lettre).",
  },
  CATEGORY_DUPLICATE_ATTRIBUTE_KEY: { status: 400, apiCode: "VALIDATION_ERROR", message: "Clé d'attribut en double." },
  CATEGORY_INVALID_ATTRIBUTE_LABEL: { status: 400, apiCode: "VALIDATION_ERROR", message: "Libellé d'attribut invalide." },
  CATEGORY_ENUM_REQUIRES_OPTIONS: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "Un attribut de type liste doit avoir au moins une option.",
  },
};

function resolveCreateError(code: string) {
  if (code.startsWith("CATEGORY_INVALID_PROMOTION_PRICING:")) {
    return {
      status: 400,
      apiCode: "VALIDATION_ERROR" as const,
      message: `Tarif de promotion invalide pour : ${code.split(":")[1]}.`,
    };
  }
  return (
    CREATE_ERROR_MAP[code] ?? {
      status: 500,
      apiCode: "INTERNAL_ERROR" as const,
      message: "Impossible de créer cette catégorie.",
    }
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "categories.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await listCategories();
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les catégories.",
      },
      500,
      auth.correlationId,
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "categories.manage");
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
    const created = await createCategory({
      ...parsed.data,
      slug: parsed.data.slug ?? "",
      actorUid: auth.admin.uid,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "categories.manage",
      resource: "listing_category",
      resourceId: created.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "create",
        category: created,
      },
    });

    return jsonSuccess({ category: created }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveCreateError(code);
    return jsonError(
      {
        code: mapped.apiCode,
        message: mapped.message,
        details: {
          categoryErrorCode: code,
        },
      },
      mapped.status,
      auth.correlationId,
    );
  }
}
