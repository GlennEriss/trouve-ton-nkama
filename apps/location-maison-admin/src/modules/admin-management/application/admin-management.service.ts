import { getFirebaseAdminAuth } from "@/lib/firebase/firebase-admin";
import type {
  AdminListItem,
  InviteAdminInput,
  ListAdminsResult,
  UpdateAdminRolesInput,
  UpdateAdminStatusInput,
} from "@/modules/admin-management/domain/types";
import { createAdminInvitation } from "@/modules/admin-management/infrastructure/admin-invitation.repository";
import type { AuthenticatedAdmin } from "@/modules/iam/domain/types";
import {
  getAdminUserByUid,
  listAdminUsers,
  updateAdminRoles,
  updateAdminStatus,
  upsertAdminUser,
} from "@/modules/iam/infrastructure/admin-user.repository";

const ONLINE_THRESHOLD_SECONDS = Number(process.env.ADMIN_ONLINE_THRESHOLD_SECONDS ?? 120);

function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= ONLINE_THRESHOLD_SECONDS * 1000;
}

export async function listAdminsWithPresence(limit = 100): Promise<ListAdminsResult> {
  const admins = await listAdminUsers(limit);
  const adminsWithPresence: AdminListItem[] = admins.map((admin) => {
    const online = isOnline(admin.lastSeenAt);
    const presenceStatus: AdminListItem["presenceStatus"] = online ? "online" : "offline";
    return {
      ...admin,
      presenceStatus,
    };
  });

  const onlineCount = adminsWithPresence.filter((admin) => admin.presenceStatus === "online").length;

  return {
    admins: adminsWithPresence,
    count: adminsWithPresence.length,
    onlineCount,
    offlineCount: adminsWithPresence.length - onlineCount,
  };
}

export async function inviteAdmin(
  input: InviteAdminInput,
  actor: AuthenticatedAdmin,
) {
  const email = input.email.trim().toLowerCase();
  const auth = getFirebaseAdminAuth();

  const authUser = await auth
    .getUserByEmail(email)
    .catch(async (error: unknown) => {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "";

      if (code.includes("user-not-found")) {
        return auth.createUser({
          email,
          displayName: input.displayName ?? undefined,
        });
      }

      throw error;
    });

  const existing = await getAdminUserByUid(authUser.uid);

  if (existing?.status === "active") {
    throw new Error("ADMIN_ALREADY_ACTIVE");
  }

  await upsertAdminUser(authUser.uid, {
    email,
    displayName: input.displayName ?? authUser.displayName ?? null,
    status: "invited",
    roles: [input.role],
    invitedBy: actor.uid,
  });

  const invitationId = await createAdminInvitation({
    email,
    role: input.role,
    invitedBy: actor.uid,
    targetUid: authUser.uid,
    status: "pending",
  });

  const admin = await getAdminUserByUid(authUser.uid);
  if (!admin) {
    throw new Error("INVITE_CREATE_FAILED");
  }

  return {
    invitationId,
    admin,
  };
}

export async function changeAdminRoles(
  input: UpdateAdminRolesInput,
  actor: AuthenticatedAdmin,
) {
  if (input.roles.length === 0) {
    throw new Error("INVALID_ROLE_SET");
  }

  if (input.uid === actor.uid) {
    throw new Error("SELF_ROLE_CHANGE_FORBIDDEN");
  }

  const existing = await getAdminUserByUid(input.uid);
  if (!existing) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  await updateAdminRoles(input.uid, input.roles);
  const updated = await getAdminUserByUid(input.uid);

  if (!updated) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  return updated;
}

export async function changeAdminStatus(
  input: UpdateAdminStatusInput,
  actor: AuthenticatedAdmin,
) {
  if (input.uid === actor.uid && input.status !== "active") {
    throw new Error("SELF_STATUS_CHANGE_FORBIDDEN");
  }

  const existing = await getAdminUserByUid(input.uid);
  if (!existing) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  await updateAdminStatus(input.uid, input.status);

  if (input.status !== "active") {
    const auth = getFirebaseAdminAuth();
    await auth.revokeRefreshTokens(input.uid);
  }

  const updated = await getAdminUserByUid(input.uid);
  if (!updated) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  return updated;
}

export async function revokeAdminAccess(uid: string, actor: AuthenticatedAdmin) {
  if (uid === actor.uid) {
    throw new Error("SELF_REVOKE_FORBIDDEN");
  }

  const existing = await getAdminUserByUid(uid);
  if (!existing) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  await updateAdminRoles(uid, []);
  await updateAdminStatus(uid, "revoked");

  const auth = getFirebaseAdminAuth();
  await auth.revokeRefreshTokens(uid);

  const updated = await getAdminUserByUid(uid);
  if (!updated) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  return updated;
}
