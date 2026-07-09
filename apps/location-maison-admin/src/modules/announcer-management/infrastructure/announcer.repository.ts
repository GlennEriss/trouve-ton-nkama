import {
  getPlatformUserByUid,
  listPlatformUsersRawPage,
} from "@/modules/user-management/infrastructure/platform-user.repository";

function hasAnnouncerRole(roles: string[]) {
  return roles.some((role) => role.toLowerCase() === "announcer");
}

export async function listAnnouncerUsersRawPage(input: {
  limit: number;
  cursor?: string | null;
  statusFilter?: "suspended" | "archived";
}) {
  return listPlatformUsersRawPage({
    limit: input.limit,
    cursor: input.cursor,
    roleFilter: "announcer",
    statusFilter: input.statusFilter,
  });
}

export async function getAnnouncerUserByUid(uid: string) {
  const user = await getPlatformUserByUid(uid);
  if (!user) {
    return null;
  }

  return hasAnnouncerRole(user.roles) ? user : null;
}
