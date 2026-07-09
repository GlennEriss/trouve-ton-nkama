import { NextRequest } from "next/server";
import { z } from "zod";

import { csvFilename, toCsvLine } from "@/lib/api/csv";
import { jsonError } from "@/lib/api/response";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listListings } from "@/modules/listing-management/application/listing-management.service";

const querySchema = z.object({
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
  maxRows: z.coerce.number().int().min(1).max(200000).optional(),
});

const PAGE_SIZE = 200;
const DEFAULT_MAX_ROWS = 50000;

function parseMultiValue(searchParams: URLSearchParams, key: string) {
  const values = searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return values.length ? values : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.export");
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
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
    maxRows: request.nextUrl.searchParams.get("maxRows") ?? undefined,
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

  const maxRows = parsed.data.maxRows ?? DEFAULT_MAX_ROWS;
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let exportedRows = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toCsvLine([
              "id",
              "titre",
              "description",
              "type_annonce",
              "status",
              "state",
              "duplicate_state",
              "prix_xaf",
              "surface_m2",
              "ville",
              "province",
              "pays",
              "created_by",
              "tags",
              "image_count",
              "primary_image_url",
              "created_at",
              "updated_at",
            ]),
          ),
        );

        while (exportedRows < maxRows) {
          const page = await listListings({
            limit: PAGE_SIZE,
            cursor: cursor ?? undefined,
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

          for (let index = 0; index < page.listings.length && exportedRows < maxRows; index += 1) {
            const listing = page.listings[index];

            controller.enqueue(
              encoder.encode(
                toCsvLine([
                  listing.id,
                  listing.title,
                  listing.description,
                  listing.typeProperty ?? "",
                  listing.status ?? "",
                  listing.state ?? "",
                  listing.duplicateState ?? "none",
                  listing.price ?? "",
                  listing.area ?? "",
                  listing.city ?? "",
                  listing.province ?? "",
                  listing.country ?? "",
                  listing.createdBy ?? "",
                  listing.tags.join("|"),
                  listing.imageCount,
                  listing.primaryImageUrl ?? "",
                  listing.createdAt ?? "",
                  listing.updatedAt ?? "",
                ]),
              ),
            );
            exportedRows += 1;
          }

          const nextCursor = page.page.nextCursor;
          if (!page.page.hasMore || !nextCursor || nextCursor === cursor) {
            break;
          }

          cursor = nextCursor;
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("export-annonces")}"`,
      "Cache-Control": "no-store",
      "x-correlation-id": auth.correlationId,
    },
  });
}
