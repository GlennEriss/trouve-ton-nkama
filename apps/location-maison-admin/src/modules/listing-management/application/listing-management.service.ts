import type {
  ListListingDuplicateGroupsInput,
  ListListingDuplicateGroupsResult,
  ListListingsInput,
  ListListingsResult,
  ListingDetails,
  ListingDuplicateGroup,
  ListingDuplicateItem,
  ListingStateFilter,
  ListingStatusFilter,
  UpdateListingInput,
  UpdateListingStateInput,
} from "@/modules/listing-management/domain/types";
import {
  getPropertyById,
  listPropertiesRawPage,
  patchPropertyById,
  patchPropertyState,
} from "@/modules/listing-management/infrastructure/listing.repository";

const MAX_SCAN_PAGES = 60;
const MIN_SCAN_LIMIT = 40;
const MAX_SCAN_DOCS = Number(process.env.ADMIN_SCAN_DOCS_LIMIT ?? 12000);

function normalizeStatusFilter(value?: string): ListingStatusFilter {
  if (value === "FOR_RENT" || value === "FOR_SALE") {
    return value;
  }
  return "all";
}

function normalizeStateFilter(value?: string): ListingStateFilter {
  if (value === "IN_PROGRESS" || value === "ARCHIVED") {
    return value;
  }
  return "all";
}

function normalizeQuery(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesStatus(
  status: "FOR_RENT" | "FOR_SALE" | null,
  filter: ListingStatusFilter,
) {
  if (filter === "all") {
    return true;
  }
  return status === filter;
}

function matchesState(
  state: string | null,
  filter: ListingStateFilter,
) {
  if (filter === "all") {
    return true;
  }
  return state === filter;
}

function matchesCreatedBy(createdBy: string | null, filter: string | null) {
  if (!filter) {
    return true;
  }
  return createdBy === filter;
}

function matchesSearch(
  listing: {
    id: string;
    title: string;
    description: string;
    city: string | null;
    province: string | null;
    country: string | null;
    createdBy: string | null;
    tags: string[];
  },
  query: string,
) {
  if (!query) {
    return true;
  }

  const haystack = [
    listing.id,
    listing.title,
    listing.description,
    listing.city ?? "",
    listing.province ?? "",
    listing.country ?? "",
    listing.createdBy ?? "",
    listing.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function normalizePatch(input: UpdateListingInput["patch"]) {
  const patch: Record<string, unknown> = {};

  const copyTrimmed = (key: keyof UpdateListingInput["patch"], targetKey = key) => {
    const value = input[key];
    if (typeof value === "string") {
      patch[targetKey] = value.trim();
    }
  };

  copyTrimmed("title");
  copyTrimmed("description");
  copyTrimmed("typeProperty");
  copyTrimmed("street");
  copyTrimmed("city");
  copyTrimmed("province");
  copyTrimmed("country");
  copyTrimmed("countryCode");
  copyTrimmed("contact");

  if (typeof input.status === "string") {
    patch.status = input.status;
  }

  if (typeof input.price === "number" && Number.isFinite(input.price)) {
    patch.price = input.price;
  }

  if (typeof input.area === "number" && Number.isFinite(input.area)) {
    patch.area = input.area;
  }

  if (typeof input.longitude === "number" && Number.isFinite(input.longitude)) {
    patch.longitude = input.longitude;
  }
  if (typeof input.latitude === "number" && Number.isFinite(input.latitude)) {
    patch.latitude = input.latitude;
  }
  if (typeof input.isLocExact === "boolean") {
    patch.isLocExact = input.isLocExact;
  }

  if (Array.isArray(input.tags)) {
    const tags = input.tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 20);
    patch.tags = Array.from(new Set(tags));
  }

  if (typeof patch.title === "string" && patch.title.length > 0) {
    patch.searchableName = patch.title.toLowerCase();
  }

  return patch;
}

function normalizeDuplicateToken(value: string | null) {
  if (!value) {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildSignature(item: ListingDuplicateItem) {
  const normalizedTitle = normalizeDuplicateToken(item.title);
  const normalizedCity = normalizeDuplicateToken(item.city);
  const normalizedProvince = normalizeDuplicateToken(item.province);
  const normalizedOwner = item.createdBy ?? "";
  const normalizedStatus = item.status ?? "";
  const roundedPrice = item.price == null ? "" : String(Math.round(item.price));
  return `${normalizedTitle}|${normalizedCity}|${normalizedProvince}|${normalizedOwner}|${normalizedStatus}|${roundedPrice}`;
}

function toDuplicateItem(details: ListingDetails): ListingDuplicateItem {
  return {
    id: details.id,
    title: details.title,
    createdBy: details.createdBy,
    price: details.price,
    status: details.status,
    state: details.state,
    city: details.city,
    province: details.province,
    primaryImageUrl: details.primaryImageUrl,
    createdAt: details.createdAt,
  };
}

function pushGroupedDuplicates(
  groups: ListingDuplicateGroup[],
  map: Map<string, ListingDuplicateItem[]>,
  reason: "same_signature" | "same_primary_image",
  minGroupSize: number,
) {
  for (const [fingerprint, items] of map.entries()) {
    if (items.length < minGroupSize) {
      continue;
    }

    const confidence = reason === "same_signature" ? Math.min(99, 55 + items.length * 10) : Math.min(94, 45 + items.length * 8);
    groups.push({
      fingerprint,
      reason,
      confidence,
      listings: items,
    });
  }
}

export async function listListings(input: ListListingsInput): Promise<ListListingsResult> {
  const safeLimit = Math.max(1, Math.min(200, input.limit || 50));
  const requestedCursor = input.cursor?.trim() || null;
  const query = normalizeQuery(input.query);
  const status = normalizeStatusFilter(input.status);
  const state = normalizeStateFilter(input.state);
  const createdBy = input.createdBy?.trim() || null;
  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));

  let cursor = requestedCursor;
  let scanCount = 0;
  let scannedDocs = 0;
  let hasMoreRaw = true;
  let hasMore = false;

  const filtered: ListListingsResult["listings"] = [];

  while (
    filtered.length < safeLimit &&
    hasMoreRaw &&
    scanCount < MAX_SCAN_PAGES &&
    scannedDocs < MAX_SCAN_DOCS
  ) {
    scanCount += 1;
    const page = await listPropertiesRawPage({
      limit: scanLimit,
      cursor,
    });

    if (page.rows.length === 0) {
      hasMoreRaw = false;
      break;
    }

    scannedDocs += page.rows.length;

    for (let index = 0; index < page.rows.length; index += 1) {
      const row = page.rows[index];
      cursor = row.docId;

      const keep =
        matchesStatus(row.listing.status, status) &&
        matchesState(row.listing.state, state) &&
        matchesCreatedBy(row.listing.createdBy, createdBy) &&
        matchesSearch(
          {
            id: row.listing.id,
            title: row.listing.title,
            description: row.listing.description,
            city: row.listing.city,
            province: row.listing.province,
            country: row.listing.country,
            createdBy: row.listing.createdBy,
            tags: row.listing.tags,
          },
          query,
        );

      if (keep) {
        filtered.push(row.listing);
      }

      if (filtered.length === safeLimit) {
        hasMore = index < page.rows.length - 1 || page.hasMore;
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

  const inProgressCount = filtered.filter((listing) => listing.state === "IN_PROGRESS").length;
  const archivedCount = filtered.filter((listing) => listing.state === "ARCHIVED").length;
  const forRentCount = filtered.filter((listing) => listing.status === "FOR_RENT").length;
  const forSaleCount = filtered.filter((listing) => listing.status === "FOR_SALE").length;

  return {
    listings: filtered,
    count: filtered.length,
    totalCount: null,
    page: {
      cursor: requestedCursor,
      nextCursor: hasMore ? cursor : null,
      hasMore,
    },
    filters: {
      query,
      status,
      state,
      createdBy,
      limit: safeLimit,
    },
    summary: {
      inProgressCount,
      archivedCount,
      forRentCount,
      forSaleCount,
    },
  };
}

export async function getListingDetails(propertyId: string) {
  return getPropertyById(propertyId);
}

export async function updateListing(input: UpdateListingInput) {
  const existing = await getPropertyById(input.propertyId);
  if (!existing) {
    return null;
  }

  const patch = normalizePatch(input.patch);
  if (Object.keys(patch).length === 0) {
    return existing;
  }

  await patchPropertyById(input.propertyId, patch);
  return getPropertyById(input.propertyId);
}

export async function updateListingState(input: UpdateListingStateInput) {
  const existing = await getPropertyById(input.propertyId);
  if (!existing) {
    return null;
  }

  await patchPropertyState(input.propertyId, input.state);
  return getPropertyById(input.propertyId);
}

export async function listListingDuplicateGroups(
  input: ListListingDuplicateGroupsInput,
): Promise<ListListingDuplicateGroupsResult> {
  const safeLimit = Math.max(50, Math.min(4000, input.limit));
  const minGroupSize = Math.max(2, Math.min(10, input.minGroupSize));

  const page = await listPropertiesRawPage({
    limit: safeLimit,
    cursor: null,
  });

  const signatureMap = new Map<string, ListingDuplicateItem[]>();
  const primaryImageMap = new Map<string, ListingDuplicateItem[]>();

  for (const row of page.rows) {
    const item = toDuplicateItem(row.details);

    const signature = buildSignature(item);
    if (signature.length > 8) {
      const current = signatureMap.get(signature) ?? [];
      current.push(item);
      signatureMap.set(signature, current);
    }

    const imageKey = normalizeDuplicateToken(item.primaryImageUrl);
    if (imageKey.length > 16) {
      const current = primaryImageMap.get(imageKey) ?? [];
      current.push(item);
      primaryImageMap.set(imageKey, current);
    }
  }

  const groups: ListingDuplicateGroup[] = [];
  pushGroupedDuplicates(groups, signatureMap, "same_signature", minGroupSize);
  pushGroupedDuplicates(groups, primaryImageMap, "same_primary_image", minGroupSize);

  groups.sort((a, b) => {
    if (b.listings.length !== a.listings.length) {
      return b.listings.length - a.listings.length;
    }
    return b.confidence - a.confidence;
  });

  return {
    groups,
    scanned: page.rows.length,
    returned: groups.length,
  };
}
