import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";

const COLLECTION =
  process.env.SOCIAL_IMPORT_IDEMPOTENCY_COLLECTION ??
  "admin_social_import_idempotency";

type IdempotencyStatus = "pending" | "completed" | "failed";

type IdempotencyDoc = {
  requestFingerprint?: unknown;
  requestStatus?: unknown;
  correlationId?: unknown;
  responseSummary?: unknown;
};

type ClaimResult<TSummary> =
  | { status: "claimed" }
  | { status: "replay"; summary: TSummary }
  | { status: "conflict" }
  | { status: "in_progress" };

function sanitizeRequestStatus(value: unknown): IdempotencyStatus {
  if (value === "pending" || value === "completed" || value === "failed") {
    return value;
  }
  return "failed";
}

export async function claimSocialImportIdempotency<TSummary>(input: {
  scope: string;
  idempotencyKey: string;
  requestFingerprint: string;
  correlationId: string;
  parseSummary: (value: unknown) => TSummary | null;
}): Promise<ClaimResult<TSummary>> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(input.idempotencyKey);
  let result: ClaimResult<TSummary> = { status: "conflict" };

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      transaction.set(
        ref,
        {
          idempotencyKey: input.idempotencyKey,
          scope: input.scope,
          requestFingerprint: input.requestFingerprint,
          requestStatus: "pending",
          correlationId: input.correlationId,
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
      typeof data.requestFingerprint === "string"
        ? data.requestFingerprint
        : "";

    if (
      !storedFingerprint ||
      storedFingerprint !== input.requestFingerprint
    ) {
      result = { status: "conflict" };
      return;
    }

    const requestStatus = sanitizeRequestStatus(data.requestStatus);
    if (requestStatus === "completed") {
      const summary = input.parseSummary(data.responseSummary);
      if (summary) {
        transaction.set(
          ref,
          {
            correlationId: input.correlationId,
            replayCount: FieldValue.increment(1),
            lastSeenAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        result = { status: "replay", summary };
        return;
      }
    }

    if (requestStatus === "pending") {
      result = { status: "in_progress" };
      return;
    }

    transaction.set(
      ref,
      {
        requestStatus: "pending",
        correlationId: input.correlationId,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    result = { status: "claimed" };
  });

  return result;
}

export async function completeSocialImportIdempotency(
  idempotencyKey: string,
  correlationId: string,
  summary: Record<string, unknown>,
) {
  const db = getFirebaseAdminDb();
  await db
    .collection(COLLECTION)
    .doc(idempotencyKey)
    .set(
      {
        requestStatus: "completed",
        correlationId,
        responseSummary: summary,
        completedAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function failSocialImportIdempotency(
  idempotencyKey: string,
  correlationId: string,
  errorCode: string,
) {
  const db = getFirebaseAdminDb();
  await db
    .collection(COLLECTION)
    .doc(idempotencyKey)
    .set(
      {
        requestStatus: "failed",
        correlationId,
        errorCode,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
