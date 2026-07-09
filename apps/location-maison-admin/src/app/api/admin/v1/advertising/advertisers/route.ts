import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import {
  createAdvertiser,
  listAdvertisers,
} from "@/modules/advertising/application/advertising.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    businessName: z.string().trim().max(160).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    contactEmail: z.string().trim().email().max(160).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "advertisers.manage");
  if (!auth.ok) return auth.response;

  try {
    const result = await listAdvertisers();
    return jsonSuccess(result, auth.correlationId);
  } catch (error) {
    return jsonError(
      { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Impossible de charger les annonceurs." },
      500,
      auth.correlationId,
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "advertisers.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Corps de requête invalide.", details: { issues: parsed.error.issues } },
      400,
      auth.correlationId,
    );
  }

  try {
    const created = await createAdvertiser({ ...parsed.data, actorUid: auth.admin.uid });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: "advertisers.manage",
      resource: "advertiser",
      resourceId: created.id,
      status: "success",
      correlationId: auth.correlationId,
      diff: { operation: "create", advertiser: created },
    });

    return jsonSuccess({ advertiser: created }, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const isValidation = code.startsWith("ADVERTISER_");
    return jsonError(
      { code: isValidation ? "VALIDATION_ERROR" : "INTERNAL_ERROR", message: "Impossible de créer l'annonceur.", details: { advertisingErrorCode: code } },
      isValidation ? 400 : 500,
      auth.correlationId,
    );
  }
}
