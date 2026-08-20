import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  listAnnouncers,
  listPlatformAnnouncers,
} from "@/modules/announcer-management/application/announcer-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
  status: z.enum(["all", "active", "suspended", "archived"]).optional(),
  presence: z.enum(["all", "online", "offline"]).optional(),
  // ?platform=true : uniquement les annonceurs gérés par la plateforme, pour la liste
  // d'accès rapide du module Apify.
  platform: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "announcers.read");

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    platform: request.nextUrl.searchParams.get("platform") ?? undefined,
    // `?? undefined` obligatoire comme sur les autres champs : searchParams.get() renvoie
    // `null` en son absence, et z.optional() n'accepte que `undefined`, pas `null` — un
    // appelant qui n'envoie jamais `limit` (comme le sélecteur rapide plateforme) fait échouer
    // toute la validation avec "Paramètres de requête invalides.", constaté en prod le
    // 2026-08-20. La recherche classique n'a jamais déclenché ce bug car elle envoie toujours
    // limit=10 explicitement.
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    presence: request.nextUrl.searchParams.get("presence") ?? undefined,
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

  if (parsed.data.platform === "true") {
    // Chemin dédié : requête directe sur le marqueur, sans le scan paginé de listAnnouncers.
    return jsonSuccess(await listPlatformAnnouncers(), auth.correlationId);
  }

  const result = await listAnnouncers({
    limit: parsed.data.limit ?? 200,
    cursor: parsed.data.cursor,
    query: parsed.data.query,
    status: parsed.data.status,
    presence: parsed.data.presence,
  });

  return jsonSuccess(result, auth.correlationId);
}
