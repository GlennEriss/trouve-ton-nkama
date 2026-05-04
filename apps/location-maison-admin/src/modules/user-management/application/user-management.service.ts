import { getFirebaseAdminAuth } from "@/lib/firebase/firebase-admin";
import type {
  ListPlatformUsersInput,
  ListPlatformUsersResult,
  PlatformUser,
  PlatformUserListItem,
  UpdatePlatformUserStatusInput,
  UserPresenceFilter,
  UserRoleFilter,
  UserStatusFilter,
} from "@/modules/user-management/domain/types";
import {
  getPlatformUserByUid,
  listPlatformUsersRawPage,
  setPlatformUserSuspended,
} from "@/modules/user-management/infrastructure/platform-user.repository";

const ONLINE_THRESHOLD_SECONDS = Number(process.env.USER_ONLINE_THRESHOLD_SECONDS ?? 300);
const MAX_SCAN_PAGES = 50;
const MIN_SCAN_LIMIT = 50;
const MAX_SCAN_DOCS = Number(process.env.ADMIN_SCAN_DOCS_LIMIT ?? 10000);

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function computePresence(lastSeenAt?: string | null) {
  const timestamp = toTimestamp(lastSeenAt);
  if (!timestamp) {
    return "offline" as const;
  }
  const isOnline = Date.now() - timestamp <= ONLINE_THRESHOLD_SECONDS * 1000;
  return isOnline ? ("online" as const) : ("offline" as const);
}

function computeFullName(user: PlatformUser) {
  const name = [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
  if (name.length > 0) {
    return name;
  }
  return user.email ?? user.uid;
}

function normalizeRoleFilter(value?: string): UserRoleFilter {
  if (value === "user" || value === "announcer" || value === "admin") {
    return value;
  }
  return "all";
}

function normalizeStatusFilter(value?: string): UserStatusFilter {
  if (value === "active" || value === "suspended" || value === "archived") {
    return value;
  }
  return "all";
}

function normalizePresenceFilter(value?: string): UserPresenceFilter {
  if (value === "online" || value === "offline") {
    return value;
  }
  return "all";
}

function hasRole(user: PlatformUser, role: "admin" | "announcer" | "user") {
  const roles = user.roles.map((item) => item.toLowerCase());
  if (role === "admin") {
    return roles.includes("admin");
  }
  if (role === "announcer") {
    return roles.includes("announcer");
  }
  return roles.includes("user") || roles.length === 0;
}

function matchesSearch(user: PlatformUserListItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    user.uid,
    user.fullName,
    user.firstname ?? "",
    user.lastname ?? "",
    user.searchableName ?? "",
    user.email ?? "",
    user.phoneNumbers.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesStatus(user: PlatformUserListItem, status: UserStatusFilter) {
  if (status === "all") {
    return true;
  }

  if (status === "suspended") {
    return user.isSuspended;
  }

  if (status === "archived") {
    return user.state === "ARCHIVED";
  }

  return user.state !== "ARCHIVED" && !user.isSuspended;
}

function matchesRole(user: PlatformUserListItem, role: UserRoleFilter) {
  if (role === "all") {
    return true;
  }
  return hasRole(user, role);
}

function matchesPresence(user: PlatformUserListItem, presence: UserPresenceFilter) {
  if (presence === "all") {
    return true;
  }
  return user.presenceStatus === presence;
}

export async function listPlatformUsers(input: ListPlatformUsersInput): Promise<ListPlatformUsersResult> {
  const safeLimit = Math.max(1, Math.min(500, input.limit || 100));
  const requestedCursor = input.cursor?.trim() || null;
  const query = input.query?.trim().toLowerCase() ?? "";
  const role = normalizeRoleFilter(input.role);
  const status = normalizeStatusFilter(input.status);
  const presence = normalizePresenceFilter(input.presence);

  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));
  const coarseRoleFilter = role === "admin" || role === "announcer" ? role : undefined;
  const coarseStatusFilter = status === "suspended" || status === "archived" ? status : undefined;

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;

  const filtered: PlatformUserListItem[] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;

    const page = await listPlatformUsersRawPage({
      limit: scanLimit,
      cursor,
      roleFilter: coarseRoleFilter,
      statusFilter: coarseStatusFilter,
    });

    if (page.users.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.users.length;

    for (let index = 0; index < page.users.length; index += 1) {
      const user = page.users[index];
      const userWithPresence: PlatformUserListItem = {
        ...user,
        fullName: computeFullName(user),
        presenceStatus: computePresence(user.lastSeenAt),
      };

      cursor = user.docId;

      const keep =
        matchesSearch(userWithPresence, query) &&
        matchesRole(userWithPresence, role) &&
        matchesStatus(userWithPresence, status) &&
        matchesPresence(userWithPresence, presence);

      if (keep) {
        filtered.push(userWithPresence);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.users.length - 1 || page.hasMore;
        break;
      }
    }

    if (filtered.length === safeLimit) {
      break;
    }

    if (!page.hasMore) {
      hasMoreRaw = false;
      break;
    }
  }

  const scanLimited = hasMoreRaw && filtered.length < safeLimit && scannedDocs >= MAX_SCAN_DOCS;
  if (scanLimited) {
    hasMore = true;
  }

  const onlineCount = filtered.filter((user) => user.presenceStatus === "online").length;
  const suspendedCount = filtered.filter((user) => user.isSuspended).length;

  return {
    users: filtered,
    count: filtered.length,
    totalCount: null,
    onlineCount,
    offlineCount: filtered.length - onlineCount,
    suspendedCount,
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      query,
      role,
      status,
      presence,
      limit: safeLimit,
    },
  };
}

export async function getPlatformUserDetails(uid: string) {
  const user = await getPlatformUserByUid(uid);
  if (!user) {
    return null;
  }

  return {
    ...user,
    fullName: computeFullName(user),
    presenceStatus: computePresence(user.lastSeenAt),
  };
}

async function setAuthUserDisabled(uid: string, disabled: boolean) {
  const auth = getFirebaseAdminAuth();
  try {
    await auth.updateUser(uid, { disabled });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    if (code.includes("user-not-found")) {
      return;
    }

    throw error;
  }
}

export async function updatePlatformUserStatus(input: UpdatePlatformUserStatusInput) {
  if (input.status === "suspended") {
    await setAuthUserDisabled(input.uid, true);
    return setPlatformUserSuspended(input.uid, {
      suspended: true,
      actorUid: input.actorUid,
    });
  }

  await setAuthUserDisabled(input.uid, false);
  return setPlatformUserSuspended(input.uid, {
    suspended: false,
    actorUid: input.actorUid,
  });
}
