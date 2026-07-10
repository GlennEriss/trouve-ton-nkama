import { z } from "zod";

import {
  LISTING_TYPE_VALUES,
  PROPERTY_TYPE_FIELD_RULES,
} from "@/modules/listing-management/domain/property-type-fields";

export { LISTING_TYPE_VALUES };

export const listingFullSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().min(10).max(5000),
    typeProperty: z.enum(LISTING_TYPE_VALUES),
    status: z.enum(["FOR_RENT", "FOR_SALE"]),
    price: z.coerce.number().min(1),
    area: z.coerce.number().min(0),
    tags: z.array(z.string().trim().min(1).max(50)).min(1).max(6),
    images: z
      .array(
        z.object({
          fileURL: z.string().trim().url(),
          filePATH: z.string().trim().optional(),
        }),
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
    const rules = PROPERTY_TYPE_FIELD_RULES[value.typeProperty] ?? [];

    for (const rule of rules) {
      const candidate = (value as Record<string, unknown>)[rule.key];
      let isValid: boolean;

      if (rule.kind === "number") {
        isValid = typeof candidate === "number" && Number.isFinite(candidate);
      } else if (rule.kind === "string") {
        isValid = typeof candidate === "string" && candidate.trim().length > 0;
      } else {
        isValid = typeof candidate === "boolean";
      }

      if (!isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${rule.label} est requis pour ce type d'annonce.`,
          path: [rule.key],
        });
      }
    }
  });

export const listingPatchSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    typeProperty: z.enum(LISTING_TYPE_VALUES).optional(),
    status: z.enum(["FOR_RENT", "FOR_SALE"]).optional(),
    price: z.coerce.number().min(1).optional(),
    area: z.coerce.number().min(0).optional(),
    street: z.string().trim().min(1).max(180).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    province: z.string().trim().min(1).max(120).optional(),
    provinceLon: z.coerce.number().min(-180).max(180).optional(),
    provinceLat: z.coerce.number().min(-90).max(90).optional(),
    cityLon: z.coerce.number().min(-180).max(180).optional(),
    cityLat: z.coerce.number().min(-90).max(90).optional(),
    streetLon: z.coerce.number().min(-180).max(180).optional(),
    streetLat: z.coerce.number().min(-90).max(90).optional(),
    additionnalInformation: z.string().trim().max(500).optional(),
    country: z.string().trim().min(1).max(80).optional(),
    countryCode: z.string().trim().min(2).max(4).optional(),
    contact: z.string().trim().max(60).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(6).optional(),
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
      .max(30)
      .optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    isLocExact: z.boolean().optional(),
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
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

export function normalizeImages(input: Array<string | { fileURL: string; filePATH?: string }>) {
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
