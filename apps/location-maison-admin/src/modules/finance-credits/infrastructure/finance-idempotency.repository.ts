import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { GrantCreditsResult } from "@/modules/finance-credits/domain/types";

const COLLECTION = process.env.FINANCE_IDEMPOTENCY_COLLECTION ?? "admin_finance_idempotency";

type IdempotencyStatus = "pending" | "completed" | "failed";

type IdempotencyDoc = {
  requestFingerprint?: unknown;
  requestStatus?: unknown;
  correlationId?: unknown;
  responseSummary?: unknown;
};

type ClaimResult =
  | { status: "claimed" }
  | { status: "replay"; summary: GrantCreditsResult }
  | { status: "conflict" }
  | { status: "in_progress" };

function parseSummary(value: unknown): GrantCreditsResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const summary = value as Record<string, unknown>;

  if (
    typeof summary.transactionId !== "string" ||
    typeof summary.uid !== "string" ||
    typeof summary.creditsGranted !== "number" ||
    typeof summary.previousCredits !== "number" ||
    typeof summary.currentCredits !== "number" ||
    typeof summary.reason !== "string" ||
    typeof summary.grantedAt !== "string"
  ) {
    return null;
  }

  return {
    transactionId: summary.transactionId,
    uid: summary.uid,
    creditsGranted: summary.creditsGranted,
    previousCredits: summary.previousCredits,
    currentCredits: summary.currentCredits,
    reason: summary.reason,
    grantedAt: summary.grantedAt,
    replayed: true,
  };
}

function sanitizeRequestStatus(value: unknown): IdempotencyStatus {
  if (value === "pending" || value === "completed" || value === "failed") {
    return value;
  }
  return "failed";
}

export async function claimFinanceGrantIdempotency(
  idempotencyKey: string,
  requestFingerprint: string,
  correlationId: string,
): Promise<ClaimResult> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(idempotencyKey);
  let result: ClaimResult = { status: "conflict" };

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      transaction.set(
        ref,
        {
          idempotencyKey,
          scope: "credits.grant",
          requestFingerprint,
          requestStatus: "pending",
          correlationId,
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
          replayCount: 0,
        },
        { merge: true },
      );

      result = { status: "claimed" };
      return;
    }

    const data = snapshot.data() as IdempotencyDoc;
    const storedFingerprint =
      typeof data.requestFingerprint === "string" ? data.requestFingerprint : "";

    if (!storedFingerprint || storedFingerprint !== requestFingerprint) {
      result = { status: "conflict" };
      return;
    }

    const currentStatus = sanitizeRequestStatus(data.requestStatus);
    if (currentStatus === "completed") {
      const summary = parseSummary(data.responseSummary);
      if (summary) {
        transaction.set(
          ref,
          {
            correlationId,
            replayCount: FieldValue.increment(1),
            lastSeenAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        result = { status: "replay", summary };
        return;
      }
    }

    if (currentStatus === "pending") {
      result = { status: "in_progress" };
      return;
    }

    transaction.set(
      ref,
      {
        requestStatus: "pending",
        correlationId,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    result = { status: "claimed" };
  });

  return result;
}

export async function completeFinanceGrantIdempotency(
  idempotencyKey: string,
  correlationId: string,
  summary: GrantCreditsResult,
) {
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTION).doc(idempotencyKey).set(
    {
      requestStatus: "completed",
      correlationId,
      responseSummary: summary,
      lastSeenAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function failFinanceGrantIdempotency(
  idempotencyKey: string,
  correlationId: string,
  errorCode: string,
) {
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTION).doc(idempotencyKey).set(
    {
      requestStatus: "failed",
      correlationId,
      lastSeenAt: FieldValue.serverTimestamp(),
      errorCode,
    },
    { merge: true },
  );
}
