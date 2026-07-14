import { NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import {
  processGiftWithdrawal,
  type WithdrawalDecision,
} from "@/modules/gift-withdrawals/application/gift-withdrawals.service";

/**
 * Logique partagée entre les décisions TRAITE/REFUSE d'une demande de retrait
 * cadeaux — mirror de handle-reel-moderation-decision.ts. Le versement mobile
 * money est effectué MANUELLEMENT par l'admin hors plateforme ; cette décision
 * n'est qu'un acte de registre (marquer versé / refuser avec motif).
 */
export async function handleWithdrawalDecision(
  request: NextRequest,
  withdrawalId: string | undefined,
  decision: WithdrawalDecision,
  bodySchema: ZodTypeAny,
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!hasPermission(auth.admin.permissions, "gift_withdrawals.process")) {
    return jsonError(
      { code: "FORBIDDEN", message: "Permission manquante : gift_withdrawals.process" },
      403,
      auth.correlationId,
    );
  }

  const trimmedId = withdrawalId?.trim();
  if (!trimmedId) {
    return jsonError(
      { code: "VALIDATION_ERROR", message: "Identifiant de retrait invalide." },
      400,
      auth.correlationId,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: { issues: parsed.error.issues },
      },
      400,
      auth.correlationId,
    );
  }

  const motif = (parsed.data as { motif?: string }).motif;

  try {
    const mutation = await processGiftWithdrawal({
      withdrawalId: trimmedId,
      actorUid: auth.admin.uid,
      decision,
      motif,
    });

    if (!mutation) {
      return jsonError(
        { code: "NOT_FOUND", message: "Demande de retrait introuvable." },
        404,
        auth.correlationId,
      );
    }

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: decision === "TRAITE" ? "gift_withdrawals.mark_paid" : "gift_withdrawals.reject",
      resource: "gift_withdrawal",
      resourceId: trimmedId,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        montantXaf: mutation.before.montantXaf,
        netPayoutXaf: mutation.before.netPayoutXaf,
        motif: motif?.trim() || (decision === "TRAITE" ? "Versé" : ""),
      },
      diff: {
        beforeStatut: mutation.before.statut,
        afterStatut: mutation.after.statut,
      },
    });

    return jsonSuccess({ withdrawal: mutation.after }, auth.correlationId);
  } catch (error) {
    if (error instanceof Error && error.message === "WITHDRAWAL_NOT_PENDING") {
      return jsonError(
        { code: "CONFLICT", message: "Cette demande a déjà été traitée." },
        409,
        auth.correlationId,
      );
    }
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de traiter la demande.",
      },
      500,
      auth.correlationId,
    );
  }
}

export const markPaidBodySchema = z.object({ motif: z.string().trim().max(500).optional() }).strict();
export const rejectWithdrawalBodySchema = z.object({ motif: z.string().trim().min(3).max(500) }).strict();
