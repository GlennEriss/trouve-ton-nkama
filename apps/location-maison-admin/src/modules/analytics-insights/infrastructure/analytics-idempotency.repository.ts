import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { AnalyticsIngestionSummary } from "@/modules/analytics-insights/domain/analytics-ingestion.types";

const COLLECTION =
  process.env.ANALYTICS_IDEMPOTENCY_COLLECTION ?? "admin_analytics_idempotency";

type IdempotencyStatus = "pending" | "completed" | "failed";

type IdempotencyDoc = {
  requestFingerprint?: unknown;
  requestStatus?: unknown;
  correlationId?: unknown;
  responseSummary?: unknown;
};

type ClaimResult =
  | { status: "claimed" }
  | { status: "replay"; summary: AnalyticsIngestionSummary }
  | { status: "conflict" }
  | { status: "in_progress" };

function parseSummary(value: unknown): AnalyticsIngestionSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const summary = value as Record<string, unknown>;
  if (
    typeof summary.batchId !== "string" ||
    typeof summary.accepted !== "number" ||
    typeof summary.rejected !== "number" ||
    typeof summary.quarantined !== "number" ||
    typeof summary.replayed !== "boolean"
  ) {
    return null;
  }

  return {
    batchId: summary.batchId,
    accepted: summary.accepted,
    rejected: summary.rejected,
    quarantined: summary.quarantined,
    replayed: summary.replayed,
  };
}

function sanitizeRequestStatus(value: unknown): IdempotencyStatus {
  if (value === "pending" || value === "completed" || value === "failed") {
    return value;
  }
  return "failed";
}

export async function claimIngestionIdempotency(
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
            lastSeenAt: FieldValue.serverTimestamp(),
            correlationId,
            replayCount: FieldValue.increment(1),
          },
          { merge: true },
        );
        result = { status: "replay", summary: { ...summary, replayed: true } };
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

export async function completeIngestionIdempotency(
  idempotencyKey: string,
  correlationId: string,
  summary: AnalyticsIngestionSummary,
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

export async function failIngestionIdempotency(
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
