import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  FinanceCreditTransaction,
  FinanceRefundItem,
  FinanceWalletItem,
  ReviewRefundInput,
  ReviewRefundResult,
} from "@/modules/finance-credits/domain/types";

const USERS_COLLECTION = "users";
const CREDIT_TRANSACTIONS_COLLECTION = "credit_transactions";
const REFUND_PAYMENTS_COLLECTION = "refund_payments";

type RawUserDoc = {
  uid?: unknown;
  firstname?: unknown;
  lastname?: unknown;
  email?: unknown;
  roles?: unknown;
  credits?: unknown;
  state?: unknown;
  isSuspended?: unknown;
  lastSeenAt?: unknown;
  last_seen_at?: unknown;
  lastActivityAt?: unknown;
  last_active_at?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type RawCreditTransactionDoc = {
  uid?: unknown;
  userId?: unknown;
  type?: unknown;
  status?: unknown;
  credits?: unknown;
  amount?: unknown;
  packId?: unknown;
  packName?: unknown;
  provider?: unknown;
  service?: unknown;
  description?: unknown;
  phoneNumber?: unknown;
  propertyId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  completedAt?: unknown;
  failureReason?: unknown;
};

type RawRefundDoc = {
  phoneNumber?: unknown;
  amount?: unknown;
  status?: unknown;
  reason?: unknown;
  createdAt?: unknown;
  refundedAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: unknown;
  decisionNote?: unknown;
};

type WalletPageResult = {
  wallets: FinanceWalletItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

type CreditTransactionsPageResult = {
  transactions: FinanceCreditTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
};

type RefundsPageResult = {
  refunds: FinanceRefundItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIso(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    const millis = value.seconds * 1000;
    const nanos =
      "nanoseconds" in value && typeof value.nanoseconds === "number"
        ? value.nanoseconds / 1_000_000
        : 0;
    return new Date(millis + nanos).toISOString();
  }

  return null;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function resolveLastSeenIso(raw: RawUserDoc) {
  return (
    toIso(raw.lastSeenAt) ??
    toIso(raw.last_seen_at) ??
    toIso(raw.lastActivityAt) ??
    toIso(raw.last_active_at) ??
    toIso(raw.updatedAt)
  );
}

function computePresence(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return "offline" as const;
  }
  const ONLINE_THRESHOLD_SECONDS = Number(process.env.USER_ONLINE_THRESHOLD_SECONDS ?? 300);
  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) {
    return "offline" as const;
  }
  return Date.now() - timestamp <= ONLINE_THRESHOLD_SECONDS * 1000
    ? ("online" as const)
    : ("offline" as const);
}

function mapWalletUser(docId: string, data: RawUserDoc): FinanceWalletItem {
  const uid = toTrimmedString(data.uid) ?? docId;
  const firstname = toTrimmedString(data.firstname);
  const lastname = toTrimmedString(data.lastname);
  const fullName = [firstname, lastname].filter(Boolean).join(" ").trim();
  const email = toTrimmedString(data.email)?.toLowerCase() ?? null;
  const lastSeenAt = resolveLastSeenIso(data);

  return {
    uid,
    docId,
    fullName: fullName.length > 0 ? fullName : email ?? uid,
    email,
    roles: toStringArray(data.roles),
    credits: toNumber(data.credits, 0),
    state: toTrimmedString(data.state),
    isSuspended: Boolean(data.isSuspended),
    presenceStatus: computePresence(lastSeenAt),
    lastSeenAt,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapCreditTransaction(docId: string, data: RawCreditTransactionDoc): FinanceCreditTransaction {
  const uid = toTrimmedString(data.uid) ?? toTrimmedString(data.userId) ?? null;
  const type = toTrimmedString(data.type) ?? "purchase";
  const status = toTrimmedString(data.status) ?? "pending";

  return {
    id: docId,
    uid,
    type,
    status,
    credits: toNumber(data.credits, 0),
    amount: toNullableNumber(data.amount),
    packId: toTrimmedString(data.packId),
    packName: toTrimmedString(data.packName),
    provider: toTrimmedString(data.provider),
    service: toTrimmedString(data.service),
    description: toTrimmedString(data.description),
    phoneNumber: toTrimmedString(data.phoneNumber),
    propertyId: toTrimmedString(data.propertyId),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    completedAt: toIso(data.completedAt),
    failureReason: toTrimmedString(data.failureReason),
  };
}

function mapRefund(docId: string, data: RawRefundDoc): FinanceRefundItem {
  return {
    id: docId,
    phoneNumber: toTrimmedString(data.phoneNumber),
    amount: toNullableNumber(data.amount),
    status: toTrimmedString(data.status) ?? "pending",
    reason: toTrimmedString(data.reason),
    createdAt: toIso(data.createdAt),
    refundedAt: toIso(data.refundedAt),
    reviewedAt: toIso(data.reviewedAt),
    reviewedBy: toTrimmedString(data.reviewedBy),
    decisionNote: toTrimmedString(data.decisionNote),
  };
}

export async function listWalletUsersRawPage(input: {
  limit: number;
  cursor?: string | null;
}): Promise<WalletPageResult> {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(500, input.limit || 100));

  let query = db
    .collection(USERS_COLLECTION)
    .orderBy(FieldPath.documentId())
    .limit(safeLimit + 1);

  const cursor = input.cursor?.trim();
  if (cursor) {
    query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > safeLimit;
  const docs = hasMore ? snapshot.docs.slice(0, safeLimit) : snapshot.docs;
  const wallets = docs.map((doc) => mapWalletUser(doc.id, doc.data() as RawUserDoc));
  const nextCursor = wallets.length > 0 ? wallets[wallets.length - 1].docId : cursor ?? null;

  return {
    wallets,
    nextCursor,
    hasMore,
  };
}

export async function listCreditTransactionsRawPage(input: {
  limit: number;
  cursor?: string | null;
}): Promise<CreditTransactionsPageResult> {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(500, input.limit || 100));

  let query = db
    .collection(CREDIT_TRANSACTIONS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(safeLimit + 1);

  const cursor = input.cursor?.trim() || null;
  if (cursor) {
    const cursorDoc = await db.collection(CREDIT_TRANSACTIONS_COLLECTION).doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > safeLimit;
  const docs = hasMore ? snapshot.docs.slice(0, safeLimit) : snapshot.docs;
  const transactions = docs.map((doc) =>
    mapCreditTransaction(doc.id, doc.data() as RawCreditTransactionDoc),
  );
  const nextCursor = transactions.length > 0 ? transactions[transactions.length - 1].id : cursor;

  return {
    transactions,
    nextCursor,
    hasMore,
  };
}

export async function listRefundsRawPage(input: {
  limit: number;
  cursor?: string | null;
}): Promise<RefundsPageResult> {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(500, input.limit || 100));

  let query = db.collection(REFUND_PAYMENTS_COLLECTION).orderBy("createdAt", "desc").limit(safeLimit + 1);

  const cursor = input.cursor?.trim() || null;
  if (cursor) {
    const cursorDoc = await db.collection(REFUND_PAYMENTS_COLLECTION).doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > safeLimit;
  const docs = hasMore ? snapshot.docs.slice(0, safeLimit) : snapshot.docs;
  const refunds = docs.map((doc) => mapRefund(doc.id, doc.data() as RawRefundDoc));
  const nextCursor = refunds.length > 0 ? refunds[refunds.length - 1].id : cursor;

  return {
    refunds,
    nextCursor,
    hasMore,
  };
}

export async function grantCreditsAndCreateTransaction(input: {
  uid: string;
  credits: number;
  reason: string;
  actorUid: string;
  actorEmail: string;
}): Promise<{
  transactionId: string;
  previousCredits: number;
  currentCredits: number;
  grantedAt: string;
}> {
  const db = getFirebaseAdminDb();

  let output: {
    transactionId: string;
    previousCredits: number;
    currentCredits: number;
    grantedAt: string;
  } | null = null;

  await db.runTransaction(async (transaction) => {
    const directRef = db.collection(USERS_COLLECTION).doc(input.uid);
    const directSnapshot = await transaction.get(directRef);

    let userRef = directRef;
    let userDocData: RawUserDoc | null = null;

    if (directSnapshot.exists) {
      userDocData = directSnapshot.data() as RawUserDoc;
    } else {
      const byUidQuery = db.collection(USERS_COLLECTION).where("uid", "==", input.uid).limit(1);
      const byUidSnapshot = await transaction.get(byUidQuery);

      if (byUidSnapshot.empty) {
        throw new Error("FINANCE_USER_NOT_FOUND");
      }

      userRef = byUidSnapshot.docs[0].ref;
      userDocData = byUidSnapshot.docs[0].data() as RawUserDoc;
    }

    const previousCredits = toNumber(userDocData?.credits, 0);
    const currentCredits = previousCredits + input.credits;
    const grantedAt = new Date().toISOString();

    transaction.set(
      userRef,
      {
        credits: currentCredits,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const txRef = db.collection(CREDIT_TRANSACTIONS_COLLECTION).doc();
    transaction.set(txRef, {
      uid: input.uid,
      userId: input.uid,
      type: "grant",
      status: "success",
      credits: input.credits,
      amount: 0,
      packId: "admin_manual_grant",
      packName: "Attribution manuelle admin",
      provider: "admin_dashboard",
      service: "manual_credit_grant",
      description: input.reason,
      grantedBy: input.actorUid,
      grantedByEmail: input.actorEmail,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    });

    output = {
      transactionId: txRef.id,
      previousCredits,
      currentCredits,
      grantedAt,
    };
  });

  if (!output) {
    throw new Error("FINANCE_GRANT_FAILED");
  }

  return output;
}

export async function reviewRefund(input: ReviewRefundInput): Promise<ReviewRefundResult | null> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(REFUND_PAYMENTS_COLLECTION).doc(input.refundId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  const current = mapRefund(snapshot.id, snapshot.data() as RawRefundDoc);
  const nowIso = new Date().toISOString();

  await ref.set(
    {
      status: input.nextStatus,
      reviewedBy: input.actorUid,
      reviewedAt: FieldValue.serverTimestamp(),
      decisionNote: input.decisionNote?.trim() || null,
      refundedAt: input.nextStatus === "approved" ? FieldValue.serverTimestamp() : current.refundedAt ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    refundId: input.refundId,
    previousStatus: current.status,
    nextStatus: input.nextStatus,
    reviewedAt: nowIso,
  };
}
