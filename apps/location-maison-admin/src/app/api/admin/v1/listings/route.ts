import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createListingForAnnouncer } from "@/modules/account-provisioning/application/account-provisioning.service";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import { listListings } from "@/modules/listing-management/application/listing-management.service";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
  status: z.enum(["all", "FOR_RENT", "FOR_SALE"]).optional(),
  state: z.enum(["all", "IN_PROGRESS", "ARCHIVED"]).optional(),
  createdBy: z.string().trim().min(1).optional(),
});

const bodySchema = z
  .object({
    announcerUid: z.string().trim().min(1),
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().min(10).max(5000),
    typeProperty: z.enum([
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
    ]),
    status: z.enum(["FOR_RENT", "FOR_SALE"]),
    price: z.coerce.number().min(1),
    area: z.coerce.number().min(0),
    tags: z.array(z.string().trim().min(1).max(50)).min(1).max(6),
    images: z
      .array(
        z.union([
          z.string().trim().url(),
          z.object({
            fileURL: z.string().trim().url(),
            filePATH: z.string().trim().optional(),
          }),
        ]),
      )
      .min(1)
      .max(30),
    street: z.string().trim().min(1).max(180),
    city: z.string().trim().min(1).max(120),
    province: z.string().trim().min(1).max(120),
    provinceLon: z.coerce.number().min(-180).max(180).optional(),
    provinceLat: z.coerce.number().min(-90).max(90).optional(),
    cityLon: z.coerce.number().min(-180).max(180).optional(),
    cityLat: z.coerce.number().min(-90).max(90).optional(),
    streetLon: z.coerce.number().min(-180).max(180).optional(),
    streetLat: z.coerce.number().min(-90).max(90).optional(),
    additionnalInformation: z.string().trim().max(500).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    country: z.string().trim().min(1).max(80),
    countryCode: z.string().trim().min(2).max(4),
    isLocExact: z.boolean().optional(),
    contact: z.string().trim().max(60).optional(),
    nbrRooms: z.coerce.number().min(0).optional(),
    nbrKitchens: z.coerce.number().min(0).optional(),
    nbrBathrooms: z.coerce.number().min(0).optional(),
    nbrToilets: z.coerce.number().min(0).optional(),
    nbrGarages: z.coerce.number().min(0).optional(),
    nbrFloors: z.coerce.number().min(0).optional(),
    nbrLivingRoom: z.coerce.number().min(0).optional(),
    nbrFloorStudio: z.coerce.number().min(0).optional(),
    numeroStudio: z.string().trim().min(1).optional(),
    nbrFloorApartment: z.coerce.number().min(0).optional(),
    numeroApartment: z.string().trim().min(1).optional(),
    nbrPiscine: z.coerce.number().min(0).optional(),
    nbrApartments: z.coerce.number().min(0).optional(),
    hasParking: z.boolean().optional(),
    nbrToilet: z.coerce.number().min(0).optional(),
    kioskType: z.string().trim().min(1).optional(),
    roomType: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const requireNumber = (field: keyof typeof value, label: string) => {
      if (typeof value[field] !== "number" || !Number.isFinite(value[field] as number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} est requis pour ce type d'annonce.`,
          path: [field],
        });
      }
    };

    const requireString = (field: keyof typeof value, label: string) => {
      const candidate = value[field];
      if (typeof candidate !== "string" || candidate.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} est requis pour ce type d'annonce.`,
          path: [field],
        });
      }
    };

    const requireLogementBase = () => {
      requireNumber("nbrRooms", "nbrRooms");
      requireNumber("nbrKitchens", "nbrKitchens");
      requireNumber("nbrBathrooms", "nbrBathrooms");
      requireNumber("nbrToilets", "nbrToilets");
    };

    if (value.typeProperty === "Logement") {
      requireLogementBase();
      return;
    }

    if (value.typeProperty === "Home") {
      requireLogementBase();
      requireNumber("nbrGarages", "nbrGarages");
      requireNumber("nbrFloors", "nbrFloors");
      requireNumber("nbrLivingRoom", "nbrLivingRoom");
      return;
    }

    if (value.typeProperty === "Studio") {
      requireLogementBase();
      requireNumber("nbrFloorStudio", "nbrFloorStudio");
      requireString("numeroStudio", "numeroStudio");
      return;
    }

    if (value.typeProperty === "Apartment") {
      requireLogementBase();
      requireNumber("nbrFloorApartment", "nbrFloorApartment");
      requireString("numeroApartment", "numeroApartment");
      return;
    }

    if (value.typeProperty === "Villa") {
      requireLogementBase();
      requireNumber("nbrFloors", "nbrFloors");
      requireNumber("nbrPiscine", "nbrPiscine");
      requireNumber("nbrGarages", "nbrGarages");
      return;
    }

    if (value.typeProperty === "Desk") {
      requireNumber("nbrToilets", "nbrToilets");
      requireNumber("nbrRooms", "nbrRooms");
      return;
    }

    if (value.typeProperty === "Building") {
      requireNumber("nbrApartments", "nbrApartments");
      requireNumber("nbrFloors", "nbrFloors");
      if (typeof value.hasParking !== "boolean") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "hasParking est requis pour ce type d'annonce.",
          path: ["hasParking"],
        });
      }
      return;
    }

    if (value.typeProperty === "Shop") {
      requireNumber("nbrRooms", "nbrRooms");
      requireNumber("nbrToilet", "nbrToilet");
      return;
    }

    if (value.typeProperty === "Kiosk") {
      requireString("kioskType", "kioskType");
      return;
    }

    if (value.typeProperty === "Room") {
      requireString("roomType", "roomType");
    }
  });

function normalizeImages(input: Array<string | { fileURL: string; filePATH?: string }>) {
  return input.map((item) => {
    if (typeof item === "string") {
      return {
        fileURL: item,
        filePATH: "",
      };
    }

    return {
      fileURL: item.fileURL,
      filePATH: item.filePATH ?? "",
    };
  });
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

  try {
    const result = await listListings({
      limit: parsed.data.limit ?? 50,
      cursor: parsed.data.cursor,
      query: parsed.data.query,
      status: parsed.data.status,
      state: parsed.data.state,
      createdBy: parsed.data.createdBy,
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
    const result = await createListingForAnnouncer({
      ...parsed.data,
      images: normalizeImages(parsed.data.images),
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
