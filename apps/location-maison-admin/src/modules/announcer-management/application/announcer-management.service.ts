import type {
  AnnouncerPresenceFilter,
  AnnouncerSocialProfiles,
  AnnouncerStatusFilter,
  ListAnnouncersInput,
  ListAnnouncersResult,
} from "@/modules/announcer-management/domain/types";
import {
  getAnnouncerUserByUid,
  listAnnouncerUsersRawPage,
} from "@/modules/announcer-management/infrastructure/announcer.repository";
import {
  listPlatformAnnouncerUsers,
  setPlatformUserMetadata,
} from "@/modules/user-management/infrastructure/platform-user.repository";

const ONLINE_THRESHOLD_SECONDS = Number(process.env.USER_ONLINE_THRESHOLD_SECONDS ?? 300);
const MAX_SCAN_PAGES = 50;
const MIN_SCAN_LIMIT = 50;
const MAX_SCAN_DOCS = Number(process.env.ADMIN_SCAN_DOCS_LIMIT ?? 10000);
const SOCIAL_NETWORK_KEYS = ["facebook", "instagram", "tiktok", "linkedin", "x"] as const;

type SocialNetworkKey = (typeof SOCIAL_NETWORK_KEYS)[number];

export type AnnouncerSocialNetwork = {
  url: string | null;
  handle: string | null;
};

export type AnnouncerSocialProfilesInput = Partial<
  Record<SocialNetworkKey, { url?: string | null; handle?: string | null } | null>
>;

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

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeHandle(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, "");
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  return /^@[A-Za-z0-9._-]{2,50}$/.test(normalized) ? normalized : null;
}

export function extractAnnouncerSocialProfiles(
  metadata: Record<string, unknown> | null,
): AnnouncerSocialProfiles {
  const rawContainer =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata.socialProfiles as unknown)
      : null;

  const rawProfiles =
    rawContainer && typeof rawContainer === "object" && !Array.isArray(rawContainer)
      ? (rawContainer as Record<string, unknown>)
      : {};

  return SOCIAL_NETWORK_KEYS.reduce((acc, key) => {
    const rawEntry =
      key in rawProfiles &&
      rawProfiles[key] &&
      typeof rawProfiles[key] === "object" &&
      !Array.isArray(rawProfiles[key])
        ? (rawProfiles[key] as Record<string, unknown>)
        : null;

    if (!rawEntry) {
      acc[key] = null;
      return acc;
    }

    const url = normalizeUrl(rawEntry.url);
    const handle = normalizeHandle(rawEntry.handle);
    acc[key] = url || handle ? { url, handle } : null;
    return acc;
  }, {} as AnnouncerSocialProfiles);
}

function normalizeAnnouncerSocialProfilesInput(
  input: AnnouncerSocialProfilesInput | null | undefined,
  fallback: AnnouncerSocialProfiles,
) {
  const next = { ...fallback };
  if (!input || typeof input !== "object") {
    return next;
  }

  for (const key of SOCIAL_NETWORK_KEYS) {
    const raw = input[key];
    if (raw === undefined) {
      continue;
    }

    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      next[key] = null;
      continue;
    }

    const url = normalizeUrl(raw.url);
    const handle = normalizeHandle(raw.handle);
    next[key] = url || handle ? { url, handle } : null;
  }

  return next;
}

function buildMetadataWithSocialProfiles(
  metadata: Record<string, unknown> | null,
  socialProfiles: AnnouncerSocialProfiles,
) {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...metadata }
      : {};

  const hasAnyValue = SOCIAL_NETWORK_KEYS.some((key) => Boolean(socialProfiles[key]));

  if (!hasAnyValue) {
    const { socialProfiles: _socialProfiles, ...rest } = base;
    return rest;
  }

  const nextSocialProfiles = SOCIAL_NETWORK_KEYS.reduce<Record<string, { url?: string; handle?: string }>>(
    (acc, key) => {
      const profile = socialProfiles[key];
      if (!profile) {
        return acc;
      }
      acc[key] = {
        ...(profile.url ? { url: profile.url } : {}),
        ...(profile.handle ? { handle: profile.handle } : {}),
      };
      return acc;
    },
    {},
  );

  return {
    ...base,
    socialProfiles: nextSocialProfiles,
  };
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

/**
 * Annonceurs gérés par la plateforme, pour la liste d'accès rapide du module Apify.
 * Même forme que les entrées de listAnnouncers pour que l'UI puisse les traiter à l'identique.
 */
export async function listPlatformAnnouncers(): Promise<{
  announcers: Array<{ uid: string; fullName: string; email: string | null; phoneNumbers: string[]; kind: string | null }>;
  count: number;
}> {
  const users = await listPlatformAnnouncerUsers(200);

  const announcers = users.map((user) => ({
    uid: user.uid,
    fullName: computeFullName(user),
    email: user.email,
    phoneNumbers: user.phoneNumbers,
    kind: user.platformAnnouncerKind,
  }));

  return { announcers, count: announcers.length };
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
        socialProfiles: extractAnnouncerSocialProfiles(user.metadata),
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
  const socialProfiles = extractAnnouncerSocialProfiles(user.metadata);

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
    socialProfiles,
    metadata: user.metadata,
  };
}

export async function updateAnnouncerSocialProfiles(input: {
  uid: string;
  socialProfiles: AnnouncerSocialProfilesInput;
}) {
  const user = await getAnnouncerUserByUid(input.uid);
  if (!user) {
    return null;
  }

  const currentSocialProfiles = extractAnnouncerSocialProfiles(user.metadata);
  const nextSocialProfiles = normalizeAnnouncerSocialProfilesInput(
    input.socialProfiles,
    currentSocialProfiles,
  );

  const nextMetadata = buildMetadataWithSocialProfiles(user.metadata, nextSocialProfiles);
  const updated = await setPlatformUserMetadata(input.uid, nextMetadata);
  if (!updated) {
    return null;
  }

  return getAnnouncerDetails(input.uid);
}
