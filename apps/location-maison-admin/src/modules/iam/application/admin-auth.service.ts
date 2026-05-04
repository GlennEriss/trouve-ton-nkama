import { getFirebaseAdminAuth } from "@/lib/firebase/firebase-admin";
import {
  getAdminUserByUid,
  touchAdminLastLogin,
  touchAdminLastSeen,
} from "@/modules/iam/infrastructure/admin-user.repository";
import {
  ADMIN_SESSION_MAX_AGE_MS,
} from "@/modules/iam/domain/session";
import { resolvePermissions } from "@/modules/iam/domain/permissions";
import type { AuthenticatedAdmin } from "@/modules/iam/domain/types";

function toAuthenticatedAdmin(admin: Awaited<ReturnType<typeof getAdminUserByUid>>): AuthenticatedAdmin {
  if (!admin) {
    throw new Error("Admin not found");
  }

  return {
    uid: admin.uid,
    email: admin.email,
    displayName: admin.displayName,
    roles: admin.roles,
    permissions: resolvePermissions(admin.roles),
  };
}

export async function createAdminSessionFromIdToken(idToken: string) {
  const auth = getFirebaseAdminAuth();
  const decodedToken = await auth.verifyIdToken(idToken, true);

  const adminUser = await getAdminUserByUid(decodedToken.uid);
  if (!adminUser) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  if (adminUser.status !== "active") {
    throw new Error("ADMIN_INACTIVE");
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: ADMIN_SESSION_MAX_AGE_MS,
  });

  await touchAdminLastLogin(adminUser.uid);

  return {
    sessionCookie,
    admin: toAuthenticatedAdmin(adminUser),
  };
}

export async function resolveAdminFromSessionCookie(sessionCookie: string) {
  const auth = getFirebaseAdminAuth();
  const decodedSession = await auth.verifySessionCookie(sessionCookie, true);

  const adminUser = await getAdminUserByUid(decodedSession.uid);

  if (!adminUser) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  if (adminUser.status !== "active") {
    throw new Error("ADMIN_INACTIVE");
  }

  await touchAdminLastSeen(adminUser.uid);

  return toAuthenticatedAdmin(adminUser);
}
