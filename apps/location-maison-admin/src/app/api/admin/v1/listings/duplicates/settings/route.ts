import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  getListingDedupAdvancedSettings,
  updateListingDedupAdvancedSettings,
} from "@/modules/listing-management/application/listing-management.service";

const patchSchema = z
  .object({
    semanticEnabled: z.boolean().optional(),
    semanticCandidateThreshold: z.coerce.number().min(0.4).max(0.99).optional(),
    semanticClusterThreshold: z.coerce.number().min(0.5).max(0.995).optional(),
    textWeight: z.coerce.number().min(0).max(1).optional(),
    priceWeight: z.coerce.number().min(0).max(1).optional(),
    locationWeight: z.coerce.number().min(0).max(1).optional(),
    maxListingsForSemantic: z.coerce.number().int().min(100).max(4000).optional(),
    maxBlockSize: z.coerce.number().int().min(20).max(500).optional(),
    minTextTokens: z.coerce.number().int().min(2).max(20).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.duplicates.read");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const settings = await getListingDedupAdvancedSettings();
    return jsonSuccess({ settings }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger la configuration dedup avancée.",
      },
      500,
      auth.correlationId,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request, "listings.duplicates.recompute");
  if (!auth.ok) {
    return auth.response;
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

  try {
    const settings = await updateListingDedupAdvancedSettings({
      actorUid: auth.admin.uid,
      patch: parsed.data,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "listings.duplicates.recompute",
      resource: "listing_duplicate_settings",
      resourceId: "default",
      status: "success",
      correlationId: auth.correlationId,
      diff: {
        settings,
      },
    });

    return jsonSuccess({ settings }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour la configuration dedup avancée.",
      },
      500,
      auth.correlationId,
    );
  }
}
