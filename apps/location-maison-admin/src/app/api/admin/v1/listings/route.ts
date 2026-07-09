import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createListingForAnnouncer } from "@/modules/account-provisioning/application/account-provisioning.service";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listListings } from "@/modules/listing-management/application/listing-management.service";
import {
  listingFullSchema,
  normalizeImages,
} from "@/modules/listing-management/presentation/listing-validation";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
  status: z.enum(["all", "FOR_RENT", "FOR_SALE"]).optional(),
  state: z.enum(["all", "IN_PROGRESS", "ARCHIVED"]).optional(),
  createdBy: z.string().trim().min(1).optional(),
  typeProperty: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  areaMin: z.coerce.number().min(0).optional(),
  areaMax: z.coerce.number().min(0).optional(),
  province: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  city: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  duplicateState: z.enum(["all", "suspected", "confirmed", "resolved"]).optional(),
});

const announcerSchema = z
  .object({
    announcerUid: z.string().trim().min(1),
  })
  .strict();

function parseMultiValue(searchParams: URLSearchParams, key: string) {
  const values = searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return values.length ? values : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.read");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    state: request.nextUrl.searchParams.get("state") ?? undefined,
    createdBy: request.nextUrl.searchParams.get("createdBy") ?? undefined,
    typeProperty: parseMultiValue(request.nextUrl.searchParams, "typeProperty"),
    priceMin: request.nextUrl.searchParams.get("priceMin") ?? undefined,
    priceMax: request.nextUrl.searchParams.get("priceMax") ?? undefined,
    areaMin: request.nextUrl.searchParams.get("areaMin") ?? undefined,
    areaMax: request.nextUrl.searchParams.get("areaMax") ?? undefined,
    province: parseMultiValue(request.nextUrl.searchParams, "province"),
    city: parseMultiValue(request.nextUrl.searchParams, "city"),
    dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
    dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
    duplicateState: request.nextUrl.searchParams.get("duplicateState") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const hasSearchCriteria =
    (parsed.data.query?.trim().length ?? 0) > 0 ||
    parsed.data.status === "FOR_RENT" ||
    parsed.data.status === "FOR_SALE" ||
    parsed.data.state === "IN_PROGRESS" ||
    parsed.data.state === "ARCHIVED" ||
    (parsed.data.createdBy?.trim().length ?? 0) > 0 ||
    (parsed.data.typeProperty?.length ?? 0) > 0 ||
    (parsed.data.province?.length ?? 0) > 0 ||
    (parsed.data.city?.length ?? 0) > 0 ||
    typeof parsed.data.priceMin === "number" ||
    typeof parsed.data.priceMax === "number" ||
    typeof parsed.data.areaMin === "number" ||
    typeof parsed.data.areaMax === "number" ||
    (parsed.data.dateFrom?.trim().length ?? 0) > 0 ||
    (parsed.data.dateTo?.trim().length ?? 0) > 0 ||
    (parsed.data.duplicateState && parsed.data.duplicateState !== "all");

  if (hasSearchCriteria && !hasPermission(auth.admin.permissions, "listings.search")) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: "Permission manquante : listings.search",
      },
      403,
      auth.correlationId,
    );
  }

  try {
    const result = await listListings({
      limit: parsed.data.limit ?? 50,
      cursor: parsed.data.cursor,
      query: parsed.data.query,
      status: parsed.data.status,
      state: parsed.data.state,
      createdBy: parsed.data.createdBy,
      typeProperty: parsed.data.typeProperty,
      priceMin: parsed.data.priceMin,
      priceMax: parsed.data.priceMax,
      areaMin: parsed.data.areaMin,
      areaMax: parsed.data.areaMax,
      province: parsed.data.province,
      city: parsed.data.city,
      dateFrom: parsed.data.dateFrom,
      dateTo: parsed.data.dateTo,
      duplicateState: parsed.data.duplicateState,
    });
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les annonces.",
      },
      500,
      auth.correlationId,
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.create");
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
      },
      400,
      auth.correlationId,
    );
  }

  const parsedAnnouncer = announcerSchema.safeParse({
    announcerUid: (body as Record<string, unknown>).announcerUid,
  });

  const rawListingPayload = {
    ...(body as Record<string, unknown>),
  };
  delete rawListingPayload.announcerUid;
  const parsedListing = listingFullSchema.safeParse({
    ...rawListingPayload,
    images: Array.isArray(rawListingPayload.images)
      ? normalizeImages(
          rawListingPayload.images as Array<string | { fileURL: string; filePATH?: string }>,
        )
      : rawListingPayload.images,
  });

  if (!parsedAnnouncer.success || !parsedListing.success) {
    const issues = [
      ...(parsedAnnouncer.success ? [] : parsedAnnouncer.error.issues),
      ...(parsedListing.success ? [] : parsedListing.error.issues),
    ];

    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: {
          issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  try {
    const result = await createListingForAnnouncer({
      announcerUid: parsedAnnouncer.data.announcerUid,
      ...parsedListing.data,
      images: normalizeImages(parsedListing.data.images),
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
        announcerUid: result.announcerUid,
        typeProperty: result.typeProperty,
        status: result.status,
      },
    });

    return jsonSuccess(result, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";

    if (code === "ANNOUNCER_NOT_FOUND") {
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "Annonceur introuvable.",
        },
        404,
        auth.correlationId,
      );
    }

    if (code === "ANNOUNCER_ROLE_REQUIRED") {
      return jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "Le compte ciblé ne possède pas le rôle annonceur.",
        },
        400,
        auth.correlationId,
      );
    }

    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible de créer l'annonce pour le moment.",
      },
      500,
      auth.correlationId,
    );
  }
}
