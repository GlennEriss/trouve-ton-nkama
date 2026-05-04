import type {
  AnnouncerPresenceFilter,
  AnnouncerStatusFilter,
  ListAnnouncersInput,
  ListAnnouncersResult,
} from "@/modules/announcer-management/domain/types";
import {
  getAnnouncerUserByUid,
  listAnnouncerUsersRawPage,
} from "@/modules/announcer-management/infrastructure/announcer.repository";

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

function computeFullName(input: { firstname: string | null; lastname: string | null; email: string | null; uid: string }) {
  const name = [input.firstname, input.lastname].filter(Boolean).join(" ").trim();
  if (name.length > 0) {
    return name;
  }
  return input.email ?? input.uid;
}

function normalizeStatusFilter(value?: string): AnnouncerStatusFilter {
  if (value === "active" || value === "suspended" || value === "archived") {
    return value;
  }
  return "all";
}

function normalizePresenceFilter(value?: string): AnnouncerPresenceFilter {
  if (value === "online" || value === "offline") {
    return value;
  }
  return "all";
}

function matchesSearch(
  user: {
    uid: string;
    fullName: string;
    email: string | null;
    phoneNumbers: string[];
  },
  query: string,
) {
  if (!query) {
    return true;
  }

  const haystack = [user.uid, user.fullName, user.email ?? "", user.phoneNumbers.join(" ")]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesStatus(
  user: {
    isSuspended: boolean;
    state: string | null;
  },
  status: AnnouncerStatusFilter,
) {
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

function matchesPresence(
  user: {
    presenceStatus: "online" | "offline";
  },
  presence: AnnouncerPresenceFilter,
) {
  if (presence === "all") {
    return true;
  }
  return user.presenceStatus === presence;
}

export async function listAnnouncers(input: ListAnnouncersInput): Promise<ListAnnouncersResult> {
  const safeLimit = Math.max(1, Math.min(500, input.limit || 200));
  const requestedCursor = input.cursor?.trim() || null;
  const query = input.query?.trim().toLowerCase() ?? "";
  const status = normalizeStatusFilter(input.status);
  const presence = normalizePresenceFilter(input.presence);
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));
  const coarseStatusFilter = status === "suspended" || status === "archived" ? status : undefined;

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;

  const filtered: ListAnnouncersResult["announcers"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;

    const page = await listAnnouncerUsersRawPage({
      limit: scanLimit,
      cursor,
      statusFilter: coarseStatusFilter,
    });

    if (page.users.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.users.length;

    for (let index = 0; index < page.users.length; index += 1) {
      const user = page.users[index];
      const item = {
        uid: user.uid,
        fullName: computeFullName(user),
        email: user.email,
        phoneNumbers: user.phoneNumbers,
        roles: user.roles,
        presenceStatus: computePresence(user.lastSeenAt),
        isSuspended: user.isSuspended,
        state: user.state,
        announcerSinceAt: user.announcerSinceAt,
        lastSeenAt: user.lastSeenAt,
        createdAt: user.createdAt,
      };

      cursor = user.docId;

      const keep =
        matchesSearch(item, query) &&
        matchesStatus(item, status) &&
        matchesPresence(item, presence);

      if (keep) {
        filtered.push(item);
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
    announcers: filtered,
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
      status,
      presence,
      limit: safeLimit,
    },
  };
}

export async function getAnnouncerDetails(uid: string) {
  const user = await getAnnouncerUserByUid(uid);
  if (!user) {
    return null;
  }

  const fullName = computeFullName(user);
  const presenceStatus = computePresence(user.lastSeenAt);

  return {
    uid: user.uid,
    docId: user.docId,
    fullName,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    phoneNumbers: user.phoneNumbers,
    roles: user.roles,
    state: user.state,
    isSuspended: user.isSuspended,
    presenceStatus,
    lastSeenAt: user.lastSeenAt,
    announcerSinceAt: user.announcerSinceAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    metadata: user.metadata,
  };
}
