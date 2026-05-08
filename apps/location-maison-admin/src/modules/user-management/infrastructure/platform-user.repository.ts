import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { PlatformUser } from "@/modules/user-management/domain/types";

const USERS_COLLECTION = "users";

type PlatformUserRoleQuery = "admin" | "announcer";

type ListPlatformUsersRawPageInput = {
  limit: number;
  cursor?: string | null;
  roleFilter?: PlatformUserRoleQuery;
  statusFilter?: "suspended" | "archived";
};

type ListPlatformUsersRawPageResult = {
  users: PlatformUser[];
  nextCursor: string | null;
  hasMore: boolean;
};

type RawUserDoc = {
  uid?: unknown;
  firstname?: unknown;
  lastname?: unknown;
  searchableName?: unknown;
  email?: unknown;
  phoneNumbers?: unknown;
  roles?: unknown;
  metadata?: unknown;
  state?: unknown;
  isSuspended?: unknown;
  suspendedAt?: unknown;
  lastSeenAt?: unknown;
  last_seen_at?: unknown;
  lastActivityAt?: unknown;
  last_active_at?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function resolveAnnouncerSinceIso(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return null;
  }

  return toIso(metadata.becomeAnnouncerAt);
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

function sanitizeRoles(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function sanitizePhones(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function resolveLastSeenIso(data: RawUserDoc) {
  return (
    toIso(data.lastSeenAt) ??
    toIso(data.last_seen_at) ??
    toIso(data.lastActivityAt) ??
    toIso(data.last_active_at) ??
    toIso(data.updatedAt)
  );
}

function mapUserDoc(docId: string, data: RawUserDoc): PlatformUser {
  const metadata = sanitizeMetadata(data.metadata);
  return {
    uid: typeof data.uid === "string" && data.uid.trim() ? data.uid.trim() : docId,
    docId,
    firstname: typeof data.firstname === "string" ? data.firstname.trim() || null : null,
    lastname: typeof data.lastname === "string" ? data.lastname.trim() || null : null,
    searchableName:
      typeof data.searchableName === "string" ? data.searchableName.trim() || null : null,
    email: typeof data.email === "string" ? data.email.trim().toLowerCase() || null : null,
    phoneNumbers: sanitizePhones(data.phoneNumbers),
    roles: sanitizeRoles(data.roles),
    metadata,
    announcerSinceAt: resolveAnnouncerSinceIso(metadata),
    state: typeof data.state === "string" ? data.state : null,
    isSuspended: Boolean(data.isSuspended),
    lastSeenAt: resolveLastSeenIso(data),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

async function findUserRefByUid(uid: string) {
  const db = getFirebaseAdminDb();
  const directRef = db.collection(USERS_COLLECTION).doc(uid);
  const directSnapshot = await directRef.get();

  if (directSnapshot.exists) {
    return {
      ref: directRef,
      user: mapUserDoc(directSnapshot.id, directSnapshot.data() as RawUserDoc),
    };
  }

  const byUidSnapshot = await db
    .collection(USERS_COLLECTION)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  if (byUidSnapshot.empty) {
    return null;
  }

  const userDoc = byUidSnapshot.docs[0];
  return {
    ref: userDoc.ref,
    user: mapUserDoc(userDoc.id, userDoc.data() as RawUserDoc),
  };
}

export async function listPlatformUsersRaw(limit = 100) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(USERS_COLLECTION).limit(limit).get();

  return snapshot.docs.map((doc) => mapUserDoc(doc.id, doc.data() as RawUserDoc));
}

function roleQueryValues(role: PlatformUserRoleQuery) {
  if (role === "admin") {
    return ["Admin", "admin"];
  }
  return ["Announcer", "announcer"];
}

export async function listPlatformUsersRawPage(
  input: ListPlatformUsersRawPageInput,
): Promise<ListPlatformUsersRawPageResult> {
  const db = getFirebaseAdminDb();
  const safeLimit = Math.max(1, Math.min(500, input.limit || 100));

  let query = db
    .collection(USERS_COLLECTION)
    .orderBy(FieldPath.documentId())
    .limit(safeLimit + 1);

  if (input.roleFilter) {
    query = query.where("roles", "array-contains-any", roleQueryValues(input.roleFilter));
  }

  if (input.statusFilter === "suspended") {
    query = query.where("isSuspended", "==", true);
  } else if (input.statusFilter === "archived") {
    query = query.where("state", "==", "ARCHIVED");
  }

  const cursor = input.cursor?.trim();
  if (cursor) {
    query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > safeLimit;
  const docs = hasMore ? snapshot.docs.slice(0, safeLimit) : snapshot.docs;
  const users = docs.map((doc) => mapUserDoc(doc.id, doc.data() as RawUserDoc));
  const nextCursor = users.length > 0 ? users[users.length - 1].docId : cursor ?? null;

  return {
    users,
    nextCursor,
    hasMore,
  };
}

export async function getPlatformUserByUid(uid: string) {
  const result = await findUserRefByUid(uid);
  return result?.user ?? null;
}

export async function setPlatformUserSuspended(
  uid: string,
  input: { suspended: boolean; actorUid: string },
) {
  const result = await findUserRefByUid(uid);
  if (!result) {
    return null;
  }

  await result.ref.set(
    {
      isSuspended: input.suspended,
      suspendedAt: input.suspended ? FieldValue.serverTimestamp() : null,
      suspendedBy: input.suspended ? input.actorUid : null,
      reactivatedAt: input.suspended ? null : FieldValue.serverTimestamp(),
      reactivatedBy: input.suspended ? null : input.actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const updatedSnapshot = await result.ref.get();
  if (!updatedSnapshot.exists) {
    return null;
  }

  return mapUserDoc(updatedSnapshot.id, updatedSnapshot.data() as RawUserDoc);
}

export async function setPlatformUserMetadata(
  uid: string,
  metadata: Record<string, unknown>,
) {
  const result = await findUserRefByUid(uid);
  if (!result) {
    return null;
  }

  await result.ref.set(
    {
      metadata,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const updatedSnapshot = await result.ref.get();
  if (!updatedSnapshot.exists) {
    return null;
  }

  return mapUserDoc(updatedSnapshot.id, updatedSnapshot.data() as RawUserDoc);
}
