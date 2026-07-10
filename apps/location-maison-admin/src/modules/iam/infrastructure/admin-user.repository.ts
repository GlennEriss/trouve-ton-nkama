import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { isAdminRole } from "@/modules/iam/domain/role-utils";
import type { AdminRole, AdminStatus, AdminUser } from "@/modules/iam/domain/types";
import { toIsoDate as toIso } from "@trouve-ton-nkama/core/utils";

const COLLECTION = "admin_users";

type AdminDoc = {
  email?: unknown;
  displayName?: unknown;
  status?: unknown;
  roles?: unknown;
  lastLoginAt?: unknown;
  lastSeenAt?: unknown;
  createdAt?: unknown;
};

function sanitizeStatus(value: unknown): AdminStatus {
  if (
    value === "active" ||
    value === "suspended" ||
    value === "invited" ||
    value === "revoked"
  ) {
    return value;
  }
  return "active";
}

function sanitizeRoles(value: unknown): AdminRole[] {
  if (!Array.isArray(value)) {
    return ["analyst_admin"];
  }

  const roles = value.filter(
    (item): item is AdminRole => isAdminRole(item),
  );

  return roles;
}

function mapDoc(uid: string, data: AdminDoc): AdminUser {
  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    status: sanitizeStatus(data.status),
    roles: sanitizeRoles(data.roles),
    lastLoginAt: toIso(data.lastLoginAt),
    lastSeenAt: toIso(data.lastSeenAt),
    createdAt: toIso(data.createdAt),
  };
}

export async function getAdminUserByUid(uid: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION).doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  return mapDoc(snapshot.id, snapshot.data() as AdminDoc);
}

export async function listAdminUsers(limit = 100) {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => mapDoc(doc.id, doc.data() as AdminDoc));
}

export async function touchAdminLastSeen(uid: string) {
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTION).doc(uid).set(
    {
      lastSeenAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function touchAdminLastLogin(uid: string) {
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTION).doc(uid).set(
    {
      lastLoginAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function upsertAdminUser(
  uid: string,
  input: {
    email: string;
    displayName?: string | null;
    status: AdminStatus;
    roles: AdminRole[];
    invitedBy?: string;
  },
) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION).doc(uid);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    transaction.set(
      ref,
      {
        email: input.email.toLowerCase(),
        displayName: input.displayName ?? null,
        status: input.status,
        roles: input.roles,
        invitedBy: input.invitedBy ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        invitedAt: input.status === "invited" ? FieldValue.serverTimestamp() : null,
        ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
  });
}

export async function updateAdminRoles(uid: string, roles: AdminRole[]) {
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTION).doc(uid).set(
    {
      roles,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateAdminStatus(uid: string, status: AdminStatus) {
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTION).doc(uid).set(
    {
      status,
      updatedAt: FieldValue.serverTimestamp(),
      revokedAt: status === "revoked" ? FieldValue.serverTimestamp() : null,
    },
    { merge: true },
  );
}
