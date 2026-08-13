import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { removeCategory, updateCategory } from "@/modules/category-management/application/category-management.service";
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

const bodySchema = z
  .object({
    parentId: z.string().trim().min(1).nullable().optional(),
    slug: z.string().trim().min(2).max(60).optional(),
    name: z.string().trim().min(2).max(60).optional(),
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
  })
  .strict();

type RouteContext = {
  params: Promise<{ categoryId: string }>;
};

const UPDATE_ERROR_MAP: Record<string, { status: number; apiCode: "CONFLICT" | "VALIDATION_ERROR"; message: string }> = {
  CATEGORY_SLUG_ALREADY_EXISTS: { status: 409, apiCode: "CONFLICT", message: "Ce slug de catégorie existe déjà." },
  CATEGORY_HAS_CHILDREN: {
    status: 409,
    apiCode: "CONFLICT",
    message: "Cette catégorie a des sous-catégories : détache-les avant de continuer.",
  },
  CATEGORY_PARENT_NOT_FOUND: { status: 400, apiCode: "VALIDATION_ERROR", message: "Catégorie parente introuvable." },
  CATEGORY_MAX_DEPTH_EXCEEDED: {
    status: 400,
    apiCode: "VALIDATION_ERROR",
    message: "L'arbre des catégories est limité à 2 niveaux (racine puis feuille).",
  },
  CATEGORY_CANNOT_BE_OWN_PARENT: { status: 400, apiCode: "VALIDATION_ERROR", message: "Une catégorie ne peut pas être son propre parent." },
  CATEGORY_INVALID_NAME: { status: 400, apiCode: "VALIDATION_ERROR", message: "Nom de catégorie invalide." },
  CATEGORY_INVALID_ORDER: { status: 400, apiCode: "VALIDATION_ERROR", message: "Ordre invalide." },
  CATEGORY_INVALID_SLUG: { status: 400, apiCode: "VALIDATION_ERROR", message: "Slug invalide." },
  CATEGORY_EMPTY_PATCH: { status: 400, apiCode: "VALIDATION_ERROR", message: "Aucun changement fourni." },
  CATEGORY_INVALID_ID: { status: 400, apiCode: "VALIDATION_ERROR", message: "Identifiant de catégorie invalide." },
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

function resolveUpdateError(code: string) {
  return (
    UPDATE_ERROR_MAP[code] ?? {
      status: 500,
      apiCode: "INTERNAL_ERROR" as const,
      message: "Impossible de mettre à jour cette catégorie.",
    }
  );
}

function resolveDeleteError(code: string) {
  if (code === "CATEGORY_HAS_CHILDREN") {
    return {
      status: 409,
      apiCode: "CONFLICT" as const,
      message: "Cette catégorie a des sous-catégories : détache-les avant de continuer.",
    };
  }
  if (code === "CATEGORY_INVALID_ID") {
    return { status: 400, apiCode: "VALIDATION_ERROR" as const, message: "Identifiant de catégorie invalide." };
  }
  return { status: 500, apiCode: "INTERNAL_ERROR" as const, message: "Impossible de supprimer cette catégorie." };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "categories.manage");
  if (!auth.ok) {
    return auth.response;
  }

  const { categoryId } = await context.params;
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
    const updated = await updateCategory({
      categoryId,
      patch: parsed.data,
      actorUid: auth.admin.uid,
    });

    if (!updated) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Catégorie introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "categories.manage",
      resource: "listing_category",
      resourceId: updated.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "update",
        patch: parsed.data,
      },
    });

    return jsonSuccess({ category: updated }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveUpdateError(code);
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request, "categories.manage");
  if (!auth.ok) {
    return auth.response;
  }

  const { categoryId } = await context.params;

  try {
    const removed = await removeCategory(categoryId);
    if (!removed) {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Catégorie introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "categories.manage",
      resource: "listing_category",
      resourceId: removed.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        operation: "delete",
        category: removed,
      },
    });

    return jsonSuccess({ category: removed }, auth.correlationId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const mapped = resolveDeleteError(code);
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
