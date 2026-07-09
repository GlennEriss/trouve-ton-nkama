import { createHash } from "node:crypto";

import redis from "@/lib/redis/client";
import type {
  BulkUpdateListingStatusInput,
  BulkUpdateListingStatusResult,
  BulkUpdateListingStateInput,
  BulkUpdateListingStateResult,
  GetListingDuplicateClusterInput,
  GetListingDuplicateClusterResult,
  ListingDedupAdvancedSettings,
  ListingDedupMonitoringMetrics,
  ListingDuplicatesByPropertyResult,
  ListingDuplicateStateFilter,
  ListingModerationHistoryResult,
  ListingModerationDecisionType,
  ListListingDuplicateGroupsInput,
  ListListingDuplicateGroupsResult,
  ListListingsInput,
  ListListingsResult,
  ListPendingListingsResult,
  UpdateListingModerationStatusInput,
  UpdateListingModerationStatusResult,
  ListingDetails,
  ListingDuplicateGroup,
  ListingDuplicateItem,
  ListingDuplicateReason,
  ListingDuplicateResolutionAction,
  RecomputeListingDuplicateGroupsInput,
  RecomputeListingDuplicateGroupsResult,
  ResolveListingDuplicateClusterInput,
  ResolveListingDuplicateClusterResult,
  ListingStateFilter,
  ListingStatusFilter,
  UpdateListingDedupAdvancedSettingsInput,
  UpdateListingInput,
  UpdateListingResult,
  UpdateListingStateInput,
  UpdateListingStateResult,
  UpdateListingStatusInput,
  UpdateListingStatusResult,
} from "@/modules/listing-management/domain/types";
import {
  deletePropertyById,
  getPropertyById,
  listPendingListings as listPendingListingsRaw,
  listPropertiesRawPage,
  patchPropertyById,
  patchPropertyModerationStatus,
  patchPropertyState,
} from "@/modules/listing-management/infrastructure/listing.repository";
import {
  getListingDedupAdvancedSettingsRecord,
  upsertListingDedupAdvancedSettingsRecord,
  upsertListingDedupMetricsDaily,
} from "@/modules/listing-management/infrastructure/listing-dedup-advanced.repository";
import {
  listDuplicateReviewRecords,
  listDuplicateReviewRecordsByClusterIds,
  upsertDuplicateReviewRecord,
} from "@/modules/listing-management/infrastructure/listing-duplicate-review.repository";
import {
  createListingModerationDecision,
  listListingAuditLogsByPropertyId,
  listListingModerationDecisionsByPropertyId,
} from "@/modules/listing-management/infrastructure/listing-moderation.repository";

const MAX_SCAN_PAGES = 60;
const MIN_SCAN_LIMIT = 40;
const MAX_SCAN_DOCS = Number(process.env.ADMIN_SCAN_DOCS_LIMIT ?? 12000);
const DEDUP_MATCHING_VERSION = "v3_semantic_local_2026_05";

const DEFAULT_DEDUP_ADVANCED_SETTINGS: ListingDedupAdvancedSettings = {
  semanticEnabled: true,
  semanticCandidateThreshold: 0.78,
  semanticClusterThreshold: 0.86,
  textWeight: 0.7,
  priceWeight: 0.15,
  locationWeight: 0.15,
  maxListingsForSemantic: 1200,
  maxBlockSize: 120,
  minTextTokens: 3,
  updatedAt: null,
  updatedBy: null,
};

type SemanticCandidateScore = {
  textScore: number;
  priceScore: number;
  locationScore: number;
  combinedScore: number;
};

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

function normalizeStringArrayFilter(value?: string[]) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return Array.from(
    new Set(
      value
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .map((item) => item.toLowerCase()),
    ),
  ).slice(0, 20);
}

function normalizeDuplicateStateFilter(value?: ListListingsInput["duplicateState"]) {
  if (
    value === "suspected" ||
    value === "confirmed" ||
    value === "resolved"
  ) {
    return value;
  }
  return "all";
}

function normalizeNullableNumber(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeDateOnly(value?: string) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function toDateTimestamp(value: string | null) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.getTime();
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

function matchesTypeProperty(typeProperty: string | null, filter: string[]) {
  if (!filter.length) {
    return true;
  }
  if (!typeProperty) {
    return false;
  }
  return filter.includes(typeProperty.trim().toLowerCase());
}

function matchesRange(value: number | null, min: number | null, max: number | null) {
  if (min == null && max == null) {
    return true;
  }
  if (value == null || !Number.isFinite(value)) {
    return false;
  }
  if (min != null && value < min) {
    return false;
  }
  if (max != null && value > max) {
    return false;
  }
  return true;
}

function matchesLocationValue(value: string | null, filter: string[]) {
  if (!filter.length) {
    return true;
  }
  if (!value) {
    return false;
  }
  return filter.includes(value.trim().toLowerCase());
}

function matchesDateRange(value: string | null, fromDate: string | null, toDate: string | null) {
  if (!fromDate && !toDate) {
    return true;
  }

  const listingTimestamp = toDateTimestamp(value);
  if (listingTimestamp == null) {
    return false;
  }

  const fromTimestamp = toDateTimestamp(fromDate);
  const toTimestamp = toDateTimestamp(toDate ? `${toDate}T23:59:59.999Z` : null);

  if (fromTimestamp != null && listingTimestamp < fromTimestamp) {
    return false;
  }
  if (toTimestamp != null && listingTimestamp > toTimestamp) {
    return false;
  }

  return true;
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
  copyTrimmed("additionnalInformation");
  copyTrimmed("country");
  copyTrimmed("countryCode");
  copyTrimmed("contact");
  copyTrimmed("numeroStudio");
  copyTrimmed("numeroApartment");
  copyTrimmed("kioskType");
  copyTrimmed("roomType");

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
  if (typeof input.provinceLon === "number" && Number.isFinite(input.provinceLon)) {
    patch.provinceLon = input.provinceLon;
  }
  if (typeof input.provinceLat === "number" && Number.isFinite(input.provinceLat)) {
    patch.provinceLat = input.provinceLat;
  }
  if (typeof input.cityLon === "number" && Number.isFinite(input.cityLon)) {
    patch.cityLon = input.cityLon;
  }
  if (typeof input.cityLat === "number" && Number.isFinite(input.cityLat)) {
    patch.cityLat = input.cityLat;
  }
  if (typeof input.streetLon === "number" && Number.isFinite(input.streetLon)) {
    patch.streetLon = input.streetLon;
  }
  if (typeof input.streetLat === "number" && Number.isFinite(input.streetLat)) {
    patch.streetLat = input.streetLat;
  }
  if (typeof input.isLocExact === "boolean") {
    patch.isLocExact = input.isLocExact;
  }
  if (typeof input.hasParking === "boolean") {
    patch.hasParking = input.hasParking;
  }

  const copyFiniteNumber = (
    key: keyof UpdateListingInput["patch"],
  ) => {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      patch[key] = value;
    }
  };

  copyFiniteNumber("nbrRooms");
  copyFiniteNumber("nbrKitchens");
  copyFiniteNumber("nbrBathrooms");
  copyFiniteNumber("nbrToilets");
  copyFiniteNumber("nbrGarages");
  copyFiniteNumber("nbrFloors");
  copyFiniteNumber("nbrLivingRoom");
  copyFiniteNumber("nbrFloorStudio");
  copyFiniteNumber("nbrFloorApartment");
  copyFiniteNumber("nbrPiscine");
  copyFiniteNumber("nbrApartments");
  copyFiniteNumber("nbrToilet");

  if (Array.isArray(input.tags)) {
    const tags = input.tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 6);
    patch.tags = Array.from(new Set(tags));
  }

  if (Array.isArray(input.images)) {
    const images = input.images
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const fileURL =
          typeof entry.fileURL === "string" ? entry.fileURL.trim() : "";
        const filePATH =
          typeof entry.filePATH === "string" ? entry.filePATH.trim() : "";
        if (!fileURL) {
          return null;
        }
        return { fileURL, filePATH };
      })
      .filter(
        (
          image,
        ): image is {
          fileURL: string;
          filePATH: string;
        } => Boolean(image),
      )
      .slice(0, 30);
    patch.images = images;
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

function buildDuplicateClusterId(reason: ListingDuplicateReason, fingerprint: string) {
  const hash = createHash("sha1")
    .update(`${reason}|${fingerprint}`)
    .digest("hex")
    .slice(0, 24);
  return `dup_${hash}`;
}

function isResolvedDuplicateAction(action: ListingDuplicateResolutionAction) {
  return (
    action === "not_duplicate" ||
    action === "confirm_duplicate" ||
    action === "archive_target" ||
    action === "keep_one_archive_others"
  );
}

function pushGroupedDuplicates(
  groups: ListingDuplicateGroup[],
  map: Map<string, ListingDuplicateItem[]>,
  reason: ListingDuplicateReason,
  minGroupSize: number,
) {
  for (const [fingerprint, items] of map.entries()) {
    if (items.length < minGroupSize) {
      continue;
    }

    const confidence = reason === "same_signature" ? Math.min(99, 55 + items.length * 10) : Math.min(94, 45 + items.length * 8);
    groups.push({
      clusterId: "",
      fingerprint,
      reason,
      confidence,
      semanticScore: null,
      scoreBreakdown: null,
      listings: items,
      resolution: null,
    });
  }
}

async function hydrateDuplicateGroupsWithReviews(
  groups: ListingDuplicateGroup[],
): Promise<ListingDuplicateGroup[]> {
  if (!groups.length) {
    return [];
  }

  const clusterIds = groups.map((group) => buildDuplicateClusterId(group.reason, group.fingerprint));
  const reviewMap = await listDuplicateReviewRecordsByClusterIds(clusterIds);

  return groups.map((group) => {
    const clusterId = buildDuplicateClusterId(group.reason, group.fingerprint);
    const review = reviewMap.get(clusterId);

    return {
      ...group,
      clusterId,
      resolution: review?.resolution ?? null,
    };
  });
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeListingDedupAdvancedSettings(
  input: Partial<ListingDedupAdvancedSettings> | null | undefined,
): ListingDedupAdvancedSettings {
  const merged: ListingDedupAdvancedSettings = {
    ...DEFAULT_DEDUP_ADVANCED_SETTINGS,
    ...input,
  };

  const normalized = {
    ...merged,
    semanticEnabled: Boolean(merged.semanticEnabled),
    semanticCandidateThreshold: clampNumber(
      Number(merged.semanticCandidateThreshold),
      0.4,
      0.99,
    ),
    semanticClusterThreshold: clampNumber(
      Number(merged.semanticClusterThreshold),
      0.5,
      0.995,
    ),
    textWeight: clampNumber(Number(merged.textWeight), 0, 1),
    priceWeight: clampNumber(Number(merged.priceWeight), 0, 1),
    locationWeight: clampNumber(Number(merged.locationWeight), 0, 1),
    maxListingsForSemantic: Math.trunc(
      clampNumber(Number(merged.maxListingsForSemantic), 100, 4000),
    ),
    maxBlockSize: Math.trunc(clampNumber(Number(merged.maxBlockSize), 20, 500)),
    minTextTokens: Math.trunc(clampNumber(Number(merged.minTextTokens), 2, 20)),
    updatedAt: merged.updatedAt ?? null,
    updatedBy: merged.updatedBy ?? null,
  };

  const weightSum =
    normalized.textWeight + normalized.priceWeight + normalized.locationWeight;
  if (weightSum <= 0.0001) {
    normalized.textWeight = DEFAULT_DEDUP_ADVANCED_SETTINGS.textWeight;
    normalized.priceWeight = DEFAULT_DEDUP_ADVANCED_SETTINGS.priceWeight;
    normalized.locationWeight = DEFAULT_DEDUP_ADVANCED_SETTINGS.locationWeight;
  }

  if (normalized.semanticClusterThreshold < normalized.semanticCandidateThreshold) {
    normalized.semanticClusterThreshold = clampNumber(
      normalized.semanticCandidateThreshold + 0.03,
      0.5,
      0.995,
    );
  }

  return normalized;
}

async function resolveDedupAdvancedSettings() {
  const record = await getListingDedupAdvancedSettingsRecord();
  return normalizeListingDedupAdvancedSettings(record);
}

function tokenizeSemanticText(value: string) {
  return normalizeDuplicateToken(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildSparseVector(tokens: string[]) {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) ?? 0) + 1);
  }

  let norm = 0;
  for (const value of map.values()) {
    norm += value * value;
  }
  norm = Math.sqrt(norm);
  if (norm <= 0) {
    return map;
  }

  for (const [token, value] of map.entries()) {
    map.set(token, value / norm);
  }
  return map;
}

function cosineSimilarity(left: Map<string, number>, right: Map<string, number>) {
  if (!left.size || !right.size) {
    return 0;
  }

  let dot = 0;
  const [smallest, largest] =
    left.size <= right.size ? [left, right] : [right, left];
  for (const [token, value] of smallest.entries()) {
    dot += value * (largest.get(token) ?? 0);
  }
  return clampNumber(dot, 0, 1);
}

function computePriceSimilarity(left: number | null, right: number | null) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || !left || !right) {
    return 0.5;
  }

  const maxValue = Math.max(left, right);
  if (maxValue <= 0) {
    return 0.5;
  }
  const ratio = Math.abs(left - right) / maxValue;
  return clampNumber(1 - ratio, 0, 1);
}

function computeLocationSimilarity(left: ListingDuplicateItem, right: ListingDuplicateItem) {
  const sameCity =
    normalizeDuplicateToken(left.city) &&
    normalizeDuplicateToken(left.city) === normalizeDuplicateToken(right.city);
  const sameProvince =
    normalizeDuplicateToken(left.province) &&
    normalizeDuplicateToken(left.province) === normalizeDuplicateToken(right.province);

  if (sameCity && sameProvince) {
    return 1;
  }
  if (sameCity || sameProvince) {
    return 0.6;
  }
  return 0;
}

function computeSemanticCandidateScore(input: {
  leftVector: Map<string, number>;
  rightVector: Map<string, number>;
  leftItem: ListingDuplicateItem;
  rightItem: ListingDuplicateItem;
  settings: ListingDedupAdvancedSettings;
}): SemanticCandidateScore {
  const textScore = cosineSimilarity(input.leftVector, input.rightVector);
  const priceScore = computePriceSimilarity(
    input.leftItem.price,
    input.rightItem.price,
  );
  const locationScore = computeLocationSimilarity(
    input.leftItem,
    input.rightItem,
  );

  const weightSum =
    input.settings.textWeight +
    input.settings.priceWeight +
    input.settings.locationWeight;
  const safeWeightSum = weightSum > 0 ? weightSum : 1;
  const combinedScore =
    (textScore * input.settings.textWeight +
      priceScore * input.settings.priceWeight +
      locationScore * input.settings.locationWeight) /
    safeWeightSum;

  return {
    textScore,
    priceScore,
    locationScore,
    combinedScore: clampNumber(combinedScore, 0, 1),
  };
}

function buildSemanticGroupFingerprint(listingIds: string[]) {
  const hash = createHash("sha1")
    .update(listingIds.sort().join("|"))
    .digest("hex")
    .slice(0, 24);
  return `semantic_${hash}`;
}

class UnionFind {
  private readonly parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

  find(value: number): number {
    if (this.parent[value] === value) {
      return value;
    }
    this.parent[value] = this.find(this.parent[value]);
    return this.parent[value];
  }

  union(left: number, right: number) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) {
      return;
    }
    this.parent[rightRoot] = leftRoot;
  }
}

function buildSemanticDuplicateGroups(input: {
  items: ListingDuplicateItem[];
  details: ListingDetails[];
  minGroupSize: number;
  settings: ListingDedupAdvancedSettings;
}): ListingDuplicateGroup[] {
  if (input.items.length < input.minGroupSize) {
    return [];
  }

  const cappedSize = Math.min(
    input.items.length,
    input.settings.maxListingsForSemantic,
  );
  const scopedItems = input.items.slice(0, cappedSize);
  const scopedDetails = input.details.slice(0, cappedSize);

  type Candidate = {
    index: number;
    item: ListingDuplicateItem;
    vector: Map<string, number>;
    tokenCount: number;
    blockKey: string;
  };

  const candidates: Candidate[] = scopedItems.map((item, index) => {
    const details = scopedDetails[index];
    const semanticText = [
      details.title,
      details.description,
      details.typeProperty ?? "",
      details.city ?? "",
      details.province ?? "",
      details.country ?? "",
      details.tags.join(" "),
    ].join(" ");
    const tokens = tokenizeSemanticText(semanticText);
    const vector = buildSparseVector(tokens);
    const blockKey = [
      normalizeDuplicateToken(item.province) || "_",
      normalizeDuplicateToken(item.city) || "_",
      item.status ?? "_",
    ].join("|");
    return {
      index,
      item,
      vector,
      tokenCount: tokens.length,
      blockKey,
    };
  });

  const blocks = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const existing = blocks.get(candidate.blockKey) ?? [];
    existing.push(candidate);
    blocks.set(candidate.blockKey, existing);
  }

  const pairScores = new Map<
    string,
    {
      textScore: number;
      priceScore: number;
      locationScore: number;
      combinedScore: number;
    }
  >();
  const unionFind = new UnionFind(candidates.length);

  const makePairKey = (left: number, right: number) =>
    left < right ? `${left}:${right}` : `${right}:${left}`;

  for (const block of blocks.values()) {
    if (block.length < input.minGroupSize) {
      continue;
    }

    if (block.length > input.settings.maxBlockSize) {
      continue;
    }

    for (let left = 0; left < block.length; left += 1) {
      for (let right = left + 1; right < block.length; right += 1) {
        const leftCandidate = block[left];
        const rightCandidate = block[right];

        if (
          leftCandidate.tokenCount < input.settings.minTextTokens &&
          rightCandidate.tokenCount < input.settings.minTextTokens
        ) {
          continue;
        }

        const score = computeSemanticCandidateScore({
          leftVector: leftCandidate.vector,
          rightVector: rightCandidate.vector,
          leftItem: leftCandidate.item,
          rightItem: rightCandidate.item,
          settings: input.settings,
        });

        if (score.combinedScore < input.settings.semanticCandidateThreshold) {
          continue;
        }

        const pairKey = makePairKey(
          leftCandidate.index,
          rightCandidate.index,
        );
        pairScores.set(pairKey, score);

        if (score.combinedScore >= input.settings.semanticClusterThreshold) {
          unionFind.union(leftCandidate.index, rightCandidate.index);
        }
      }
    }
  }

  const clusterIndexMap = new Map<number, number[]>();
  for (const candidate of candidates) {
    const root = unionFind.find(candidate.index);
    const existing = clusterIndexMap.get(root) ?? [];
    existing.push(candidate.index);
    clusterIndexMap.set(root, existing);
  }

  const groups: ListingDuplicateGroup[] = [];
  for (const clusterIndexes of clusterIndexMap.values()) {
    if (clusterIndexes.length < input.minGroupSize) {
      continue;
    }

    const listingIds = clusterIndexes
      .map((index) => candidates[index].item.id)
      .sort();

    let totalTextScore = 0;
    let totalPriceScore = 0;
    let totalLocationScore = 0;
    let totalCombinedScore = 0;
    let scoreCount = 0;

    for (let left = 0; left < clusterIndexes.length; left += 1) {
      for (let right = left + 1; right < clusterIndexes.length; right += 1) {
        const pairKey = makePairKey(clusterIndexes[left], clusterIndexes[right]);
        const score = pairScores.get(pairKey);
        if (!score) {
          continue;
        }
        totalTextScore += score.textScore;
        totalPriceScore += score.priceScore;
        totalLocationScore += score.locationScore;
        totalCombinedScore += score.combinedScore;
        scoreCount += 1;
      }
    }

    if (!scoreCount) {
      continue;
    }

    const averageCombined = totalCombinedScore / scoreCount;
    const averageText = totalTextScore / scoreCount;
    const averagePrice = totalPriceScore / scoreCount;
    const averageLocation = totalLocationScore / scoreCount;

    groups.push({
      clusterId: "",
      fingerprint: buildSemanticGroupFingerprint(listingIds),
      reason: "semantic_similarity",
      confidence: Math.round(clampNumber(averageCombined, 0, 0.99) * 100),
      semanticScore: Number(averageCombined.toFixed(4)),
      scoreBreakdown: {
        textScore: Number(averageText.toFixed(4)),
        priceScore: Number(averagePrice.toFixed(4)),
        locationScore: Number(averageLocation.toFixed(4)),
      },
      listings: clusterIndexes.map((index) => candidates[index].item),
      resolution: null,
    });
  }

  return groups;
}

async function buildDuplicateStateIndex(input: {
  scanLimit: number;
  minGroupSize: number;
}) {
  const groupsResult = await listListingDuplicateGroups({
    limit: Math.max(200, Math.min(4000, input.scanLimit)),
    minGroupSize: Math.max(2, Math.min(10, input.minGroupSize)),
    includeResolved: true,
    includeSemantic: true,
  });

  const map = new Map<string, "suspected" | "confirmed" | "resolved">();

  const getRank = (value: "suspected" | "confirmed" | "resolved") => {
    if (value === "confirmed") {
      return 3;
    }
    if (value === "suspected") {
      return 2;
    }
    return 1;
  };

  for (const group of groupsResult.groups) {
    let groupState: "suspected" | "confirmed" | "resolved" = "suspected";

    if (group.resolution) {
      if (
        group.resolution.action === "confirm_duplicate" ||
        group.resolution.action === "archive_target" ||
        group.resolution.action === "keep_one_archive_others"
      ) {
        groupState = "confirmed";
      } else if (group.resolution.action === "not_duplicate") {
        groupState = "resolved";
      } else {
        groupState = "suspected";
      }
    }

    for (const listing of group.listings) {
      const current = map.get(listing.id);
      if (!current || getRank(groupState) > getRank(current)) {
        map.set(listing.id, groupState);
      }
    }
  }

  return map;
}

function matchesDuplicateState(
  listingId: string,
  filter: ListingDuplicateStateFilter,
  index: Map<string, "suspected" | "confirmed" | "resolved"> | null,
) {
  if (filter === "all") {
    return true;
  }
  if (!index) {
    return false;
  }
  return index.get(listingId) === filter;
}

export async function listListings(input: ListListingsInput): Promise<ListListingsResult> {
  const safeLimit = Math.max(1, Math.min(200, input.limit || 50));
  const requestedCursor = input.cursor?.trim() || null;
  const query = normalizeQuery(input.query);
  const status = normalizeStatusFilter(input.status);
  const state = normalizeStateFilter(input.state);
  const createdBy = input.createdBy?.trim() || null;
  const typeProperty = normalizeStringArrayFilter(input.typeProperty);
  const province = normalizeStringArrayFilter(input.province);
  const city = normalizeStringArrayFilter(input.city);
  const duplicateState = normalizeDuplicateStateFilter(input.duplicateState);
  const dateFrom = normalizeDateOnly(input.dateFrom);
  const dateTo = normalizeDateOnly(input.dateTo);

  const normalizedPriceMin = normalizeNullableNumber(input.priceMin);
  const normalizedPriceMax = normalizeNullableNumber(input.priceMax);
  const normalizedAreaMin = normalizeNullableNumber(input.areaMin);
  const normalizedAreaMax = normalizeNullableNumber(input.areaMax);

  const [priceMin, priceMax] =
    normalizedPriceMin != null &&
    normalizedPriceMax != null &&
    normalizedPriceMin > normalizedPriceMax
      ? [normalizedPriceMax, normalizedPriceMin]
      : [normalizedPriceMin, normalizedPriceMax];

  const [areaMin, areaMax] =
    normalizedAreaMin != null &&
    normalizedAreaMax != null &&
    normalizedAreaMin > normalizedAreaMax
      ? [normalizedAreaMax, normalizedAreaMin]
      : [normalizedAreaMin, normalizedAreaMax];

  const scanLimit = Math.max(MIN_SCAN_LIMIT, Math.min(500, safeLimit * 3));
  const duplicateStateIndex = await buildDuplicateStateIndex({
    scanLimit: Math.max(600, Math.min(4000, safeLimit * 20)),
    minGroupSize: 2,
  });

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
        matchesTypeProperty(row.listing.typeProperty, typeProperty) &&
        matchesRange(row.listing.price, priceMin, priceMax) &&
        matchesRange(row.listing.area, areaMin, areaMax) &&
        matchesLocationValue(row.listing.province, province) &&
        matchesLocationValue(row.listing.city, city) &&
        matchesDateRange(row.listing.createdAt, dateFrom, dateTo) &&
        matchesDuplicateState(row.listing.id, duplicateState, duplicateStateIndex) &&
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
        filtered.push({
          ...row.listing,
          duplicateState: duplicateStateIndex?.get(row.listing.id) ?? "none",
        });
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
      typeProperty,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      province,
      city,
      dateFrom,
      dateTo,
      duplicateState,
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

export async function updateListing(input: UpdateListingInput): Promise<UpdateListingResult | null> {
  const existing = await getPropertyById(input.propertyId);
  if (!existing) {
    return null;
  }

  const patch = normalizePatch(input.patch);
  if (Object.keys(patch).length === 0) {
    return {
      before: existing,
      after: existing,
      patch,
    };
  }

  await patchPropertyById(input.propertyId, patch);
  const updated = await getPropertyById(input.propertyId);
  if (!updated) {
    throw new Error("LISTING_UPDATE_FAILED");
  }

  return {
    before: existing,
    after: updated,
    patch,
  };
}

export async function updateListingState(
  input: UpdateListingStateInput,
): Promise<UpdateListingStateResult | null> {
  const existing = await getPropertyById(input.propertyId);
  if (!existing) {
    return null;
  }

  await patchPropertyState(input.propertyId, input.state);
  const updated = await getPropertyById(input.propertyId);
  if (!updated) {
    throw new Error("LISTING_UPDATE_FAILED");
  }

  return {
    before: existing,
    after: updated,
  };
}

// Distinct de updateListingState : moderationStatus (PENDING/APPROVED/REJECTED) gère la
// review avant publication, pas l'archivage. Ne touche jamais `state`.
export async function updateListingModerationStatus(
  input: UpdateListingModerationStatusInput,
): Promise<UpdateListingModerationStatusResult | null> {
  const existing = await getPropertyById(input.propertyId);
  if (!existing) {
    return null;
  }

  if (existing.moderationStatus !== "PENDING") {
    // Idempotence : évite qu'un double-clic (ou deux onglets admin) ne traite deux fois
    // la même annonce et ne déclenche deux notifications.
    throw new Error("LISTING_NOT_PENDING");
  }

  const moderationStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  await patchPropertyModerationStatus(input.propertyId, {
    moderationStatus,
    rejectionReason: input.decision === "REJECT" ? input.reason ?? null : null,
    reviewedBy: input.actorUid,
  });

  const updated = await getPropertyById(input.propertyId);
  if (!updated) {
    throw new Error("LISTING_UPDATE_FAILED");
  }

  // Best-effort : invalide le cache Redis de location-maison (même instance Upstash)
  // pour que l'annonce approuvée/rejetée n'attende pas jusqu'à 10 min avant de refléter
  // le changement côté public. Ne doit jamais faire échouer la décision de modération.
  try {
    if (redis) {
      await redis.del(`property:${input.propertyId}`);
    }
  } catch (error) {
    console.warn("Redis invalidation failed after moderation decision", {
      propertyId: input.propertyId,
      error,
    });
  }

  return {
    before: existing,
    after: updated,
  };
}

export async function listPendingListings(input: {
  limit: number;
  cursor?: string;
}): Promise<ListPendingListingsResult> {
  const safeLimit = Math.max(1, Math.min(100, input.limit || 20));
  const cursor = input.cursor?.trim() || null;

  const page = await listPendingListingsRaw({ limit: safeLimit, cursor });
  const nextCursor =
    page.hasMore && page.rows.length > 0 ? page.rows[page.rows.length - 1].docId : null;

  return {
    listings: page.rows.map((row) => row.listing),
    page: {
      cursor,
      nextCursor,
      hasMore: page.hasMore,
    },
  };
}

export async function updateListingStatus(
  input: UpdateListingStatusInput,
): Promise<UpdateListingStatusResult | null> {
  const existing = await getPropertyById(input.propertyId);
  if (!existing) {
    return null;
  }

  const mutation = await updateListing({
    propertyId: input.propertyId,
    actorUid: input.actorUid,
    patch: {
      status: input.status,
    },
  });

  if (!mutation) {
    return null;
  }

  return {
    before: mutation.before,
    after: mutation.after,
  };
}

export async function deleteListing(propertyId: string) {
  const existing = await getPropertyById(propertyId);
  if (!existing) {
    return null;
  }

  await deletePropertyById(propertyId);
  return existing;
}

export async function bulkUpdateListingState(
  input: BulkUpdateListingStateInput,
): Promise<BulkUpdateListingStateResult> {
  const uniqueIds = Array.from(
    new Set(
      input.propertyIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

  const updated: BulkUpdateListingStateResult["updated"] = [];
  const notFoundIds: string[] = [];
  const failed: BulkUpdateListingStateResult["failed"] = [];

  for (const propertyId of uniqueIds) {
    try {
      const result = await updateListingState({
        propertyId,
        actorUid: input.actorUid,
        state: input.state,
      });

      if (!result) {
        notFoundIds.push(propertyId);
        continue;
      }

      updated.push({
        id: propertyId,
        beforeState: result.before.state,
        afterState: result.after.state,
      });
    } catch (error) {
      failed.push({
        id: propertyId,
        reason: error instanceof Error ? error.message : "LISTING_BULK_STATE_FAILED",
      });
    }
  }

  return {
    state: input.state,
    requestedCount: uniqueIds.length,
    updatedCount: updated.length,
    notFoundCount: notFoundIds.length,
    failedCount: failed.length,
    updated,
    notFoundIds,
    failed,
  };
}

export async function bulkUpdateListingStatus(
  input: BulkUpdateListingStatusInput,
): Promise<BulkUpdateListingStatusResult> {
  const uniqueIds = Array.from(
    new Set(
      input.propertyIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

  const updated: BulkUpdateListingStatusResult["updated"] = [];
  const notFoundIds: string[] = [];
  const failed: BulkUpdateListingStatusResult["failed"] = [];

  for (const propertyId of uniqueIds) {
    try {
      const result = await updateListingStatus({
        propertyId,
        actorUid: input.actorUid,
        status: input.status,
      });

      if (!result) {
        notFoundIds.push(propertyId);
        continue;
      }

      updated.push({
        id: propertyId,
        beforeStatus: result.before.status,
        afterStatus: result.after.status,
      });
    } catch (error) {
      failed.push({
        id: propertyId,
        reason: error instanceof Error ? error.message : "LISTING_BULK_STATUS_FAILED",
      });
    }
  }

  return {
    status: input.status,
    requestedCount: uniqueIds.length,
    updatedCount: updated.length,
    notFoundCount: notFoundIds.length,
    failedCount: failed.length,
    updated,
    notFoundIds,
    failed,
  };
}

export async function listListingDuplicateGroups(
  input: ListListingDuplicateGroupsInput,
): Promise<ListListingDuplicateGroupsResult> {
  const safeLimit = Math.max(50, Math.min(4000, input.limit));
  const minGroupSize = Math.max(2, Math.min(10, input.minGroupSize));
  const includeResolved = input.includeResolved ?? true;
  const dedupSettings = await resolveDedupAdvancedSettings();
  const includeSemantic =
    input.includeSemantic ?? dedupSettings.semanticEnabled;

  const page = await listPropertiesRawPage({
    limit: safeLimit,
    cursor: null,
  });

  const signatureMap = new Map<string, ListingDuplicateItem[]>();
  const primaryImageMap = new Map<string, ListingDuplicateItem[]>();
  const semanticItems: ListingDuplicateItem[] = [];
  const semanticDetails: ListingDetails[] = [];

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

    if (includeSemantic && semanticItems.length < dedupSettings.maxListingsForSemantic) {
      semanticItems.push(item);
      semanticDetails.push(row.details);
    }
  }

  const groups: ListingDuplicateGroup[] = [];
  pushGroupedDuplicates(groups, signatureMap, "same_signature", minGroupSize);
  pushGroupedDuplicates(groups, primaryImageMap, "same_primary_image", minGroupSize);

  if (includeSemantic && dedupSettings.semanticEnabled) {
    const semanticGroups = buildSemanticDuplicateGroups({
      items: semanticItems,
      details: semanticDetails,
      minGroupSize,
      settings: dedupSettings,
    });
    groups.push(...semanticGroups);
  }

  groups.sort((a, b) => {
    if (b.listings.length !== a.listings.length) {
      return b.listings.length - a.listings.length;
    }
    return b.confidence - a.confidence;
  });

  const hydratedGroups = await hydrateDuplicateGroupsWithReviews(groups);
  const resolvedCount = hydratedGroups.filter(
    (group) =>
      group.resolution && isResolvedDuplicateAction(group.resolution.action),
  ).length;
  const unresolvedCount = hydratedGroups.length - resolvedCount;
  const semanticGroupsCount = hydratedGroups.filter(
    (group) => group.reason === "semantic_similarity",
  ).length;
  const visibleGroups = includeResolved
    ? hydratedGroups
    : hydratedGroups.filter(
        (group) =>
          !group.resolution ||
          !isResolvedDuplicateAction(group.resolution.action),
      );

  return {
    groups: visibleGroups,
    scanned: page.rows.length,
    returned: visibleGroups.length,
    resolvedCount,
    unresolvedCount,
    semanticGroupsCount,
    matchingVersion: `${DEDUP_MATCHING_VERSION}|local`,
  };
}

export async function getListingDedupAdvancedSettings() {
  return resolveDedupAdvancedSettings();
}

export async function updateListingDedupAdvancedSettings(
  input: UpdateListingDedupAdvancedSettingsInput,
) {
  const normalizedPatch: Partial<
    Omit<ListingDedupAdvancedSettings, "updatedAt" | "updatedBy">
  > = {};

  if (typeof input.patch.semanticEnabled === "boolean") {
    normalizedPatch.semanticEnabled = input.patch.semanticEnabled;
  }

  const assignIfFinite = (
    key: keyof Omit<ListingDedupAdvancedSettings, "updatedAt" | "updatedBy">,
    value: unknown,
  ) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      normalizedPatch[key] = value as never;
    }
  };

  assignIfFinite(
    "semanticCandidateThreshold",
    input.patch.semanticCandidateThreshold,
  );
  assignIfFinite(
    "semanticClusterThreshold",
    input.patch.semanticClusterThreshold,
  );
  assignIfFinite("textWeight", input.patch.textWeight);
  assignIfFinite("priceWeight", input.patch.priceWeight);
  assignIfFinite("locationWeight", input.patch.locationWeight);
  assignIfFinite("maxListingsForSemantic", input.patch.maxListingsForSemantic);
  assignIfFinite("maxBlockSize", input.patch.maxBlockSize);
  assignIfFinite("minTextTokens", input.patch.minTextTokens);

  const record = await upsertListingDedupAdvancedSettingsRecord({
    patch: normalizedPatch,
    actorUid: input.actorUid,
  });

  return normalizeListingDedupAdvancedSettings(record);
}

function toRoundedRate(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(4));
}

function buildListingDedupMonitoringMetrics(input: {
  groupsResult: ListListingDuplicateGroupsResult;
  truePositiveDecisions: number;
  falsePositiveDecisions: number;
  pendingReviewDecisions: number;
}): ListingDedupMonitoringMetrics {
  const reviewedDecisions =
    input.truePositiveDecisions + input.falsePositiveDecisions;
  const precision =
    reviewedDecisions > 0
      ? input.truePositiveDecisions / reviewedDecisions
      : null;
  const recallDenominator =
    input.truePositiveDecisions + input.groupsResult.unresolvedCount;
  const recallProxy =
    recallDenominator > 0
      ? input.truePositiveDecisions / recallDenominator
      : null;
  const totalClusters = Math.max(
    0,
    input.groupsResult.resolvedCount + input.groupsResult.unresolvedCount,
  );
  const reviewCoverage =
    totalClusters > 0 ? reviewedDecisions / totalClusters : 0;

  return {
    measuredAt: new Date().toISOString(),
    totalClustersDetected: totalClusters,
    semanticClustersDetected: input.groupsResult.semanticGroupsCount,
    resolvedClusters: input.groupsResult.resolvedCount,
    unresolvedClusters: input.groupsResult.unresolvedCount,
    truePositiveDecisions: input.truePositiveDecisions,
    falsePositiveDecisions: input.falsePositiveDecisions,
    pendingReviewDecisions: input.pendingReviewDecisions,
    precision: toRoundedRate(precision),
    recallProxy: toRoundedRate(recallProxy),
    reviewCoverage: toRoundedRate(reviewCoverage) ?? 0,
  };
}

export async function getListingDuplicateMonitoringMetrics(input: {
  limit: number;
  minGroupSize: number;
  includeSemantic?: boolean;
}) {
  const groupsResult = await listListingDuplicateGroups({
    limit: input.limit,
    minGroupSize: input.minGroupSize,
    includeResolved: true,
    includeSemantic: input.includeSemantic,
  });

  const reviews = await listDuplicateReviewRecords(20000);
  let truePositiveDecisions = 0;
  let falsePositiveDecisions = 0;
  let pendingReviewDecisions = 0;

  for (const review of reviews) {
    if (
      review.resolution.action === "confirm_duplicate" ||
      review.resolution.action === "archive_target" ||
      review.resolution.action === "keep_one_archive_others"
    ) {
      truePositiveDecisions += 1;
      continue;
    }
    if (review.resolution.action === "not_duplicate") {
      falsePositiveDecisions += 1;
      continue;
    }
    if (review.resolution.action === "needs_review") {
      pendingReviewDecisions += 1;
    }
  }

  return buildListingDedupMonitoringMetrics({
    groupsResult,
    truePositiveDecisions,
    falsePositiveDecisions,
    pendingReviewDecisions,
  });
}

export async function getListingDuplicateCluster(
  input: GetListingDuplicateClusterInput,
): Promise<GetListingDuplicateClusterResult | null> {
  const clusterId = input.clusterId.trim();
  if (!clusterId) {
    return null;
  }

  const listingDuplicateGroups = await listListingDuplicateGroups({
    limit: input.limit,
    minGroupSize: input.minGroupSize,
    includeResolved: true,
    includeSemantic: input.includeSemantic,
  });
  const cluster = listingDuplicateGroups.groups.find(
    (group) => group.clusterId === clusterId,
  );

  if (!cluster) {
    return null;
  }

  return {
    cluster,
    scanned: listingDuplicateGroups.scanned,
  };
}

export async function resolveListingDuplicateCluster(
  input: ResolveListingDuplicateClusterInput,
): Promise<ResolveListingDuplicateClusterResult | null> {
  const duplicateCluster = await getListingDuplicateCluster({
    clusterId: input.clusterId,
    limit: input.limit,
    minGroupSize: input.minGroupSize,
    includeSemantic: input.includeSemantic,
  });

  if (!duplicateCluster) {
    return null;
  }

  const cluster = duplicateCluster.cluster;
  const note = input.note?.trim() || null;

  let archivedListingId: string | null = null;
  const archivedListingIds: string[] = [];
  let keptListingId: string | null = null;
  let previousTargetState: string | null = null;
  let nextTargetState: string | null = null;

  if (
    input.action === "archive_target" ||
    input.action === "keep_one_archive_others"
  ) {
    const targetListingId = input.targetListingId?.trim();
    if (!targetListingId) {
      throw new Error("LISTING_DUPLICATE_TARGET_REQUIRED");
    }

    const isTargetInCluster = cluster.listings.some(
      (listing) => listing.id === targetListingId,
    );
    if (!isTargetInCluster) {
      throw new Error("LISTING_DUPLICATE_TARGET_NOT_IN_CLUSTER");
    }

    if (input.action === "archive_target") {
      const mutation = await updateListingState({
        propertyId: targetListingId,
        actorUid: input.actorUid,
        state: "ARCHIVED",
      });

      if (!mutation) {
        throw new Error("LISTING_DUPLICATE_TARGET_NOT_FOUND");
      }

      archivedListingId = targetListingId;
      archivedListingIds.push(targetListingId);
      previousTargetState = mutation.before.state;
      nextTargetState = mutation.after.state;
    } else {
      keptListingId = targetListingId;
      const listingsToArchive = cluster.listings
        .map((listing) => listing.id)
        .filter((listingId) => listingId !== targetListingId);

      for (const listingId of listingsToArchive) {
        const mutation = await updateListingState({
          propertyId: listingId,
          actorUid: input.actorUid,
          state: "ARCHIVED",
        });

        if (!mutation) {
          throw new Error("LISTING_DUPLICATE_TARGET_NOT_FOUND");
        }

        archivedListingIds.push(listingId);
      }
    }
  }

  const reviewRecord = await upsertDuplicateReviewRecord({
    clusterId: cluster.clusterId,
    fingerprint: cluster.fingerprint,
    reason: cluster.reason,
    listingIds: cluster.listings.map((listing) => listing.id),
    action: input.action,
    note,
    targetListingId:
      input.action === "archive_target"
        ? archivedListingId
        : input.action === "keep_one_archive_others"
          ? keptListingId
          : null,
    actorUid: input.actorUid,
    actorRoles: input.actorRoles,
  });

  if (!reviewRecord) {
    throw new Error("LISTING_DUPLICATE_REVIEW_WRITE_FAILED");
  }

  return {
    cluster: {
      ...cluster,
      resolution: reviewRecord.resolution,
    },
    action: input.action,
    archivedListingId,
    archivedListingIds,
    archivedListingCount: archivedListingIds.length,
    keptListingId,
    previousTargetState,
    nextTargetState,
  };
}

export async function recomputeListingDuplicateGroups(
  input: RecomputeListingDuplicateGroupsInput,
): Promise<RecomputeListingDuplicateGroupsResult> {
  const groupsResult = await listListingDuplicateGroups({
    limit: input.limit,
    minGroupSize: input.minGroupSize,
    includeResolved: input.includeResolved,
    includeSemantic: input.includeSemantic,
  });

  const metrics = await getListingDuplicateMonitoringMetrics({
    limit: input.limit,
    minGroupSize: input.minGroupSize,
    includeSemantic: input.includeSemantic,
  });

  if (input.actorUid?.trim()) {
    await upsertListingDedupMetricsDaily({
      metrics,
      measuredBy: input.actorUid.trim(),
    });
  }

  return {
    ...groupsResult,
    metrics,
  };
}

export async function recordListingModerationDecision(input: {
  propertyId: string;
  decision: ListingModerationDecisionType;
  reason: string;
  beforeState: string | null;
  afterState: string | null;
  beforeStatus: "FOR_RENT" | "FOR_SALE" | null;
  afterStatus: "FOR_RENT" | "FOR_SALE" | null;
  beforeModerationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  afterModerationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  actorId: string;
  actorRoles: string[];
  correlationId: string;
}) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("LISTING_MODERATION_REASON_REQUIRED");
  }

  await createListingModerationDecision({
    ...input,
    reason,
  });
}

export async function listListingModerationHistory(input: {
  propertyId: string;
  limit?: number;
}): Promise<ListingModerationHistoryResult> {
  const propertyId = input.propertyId.trim();
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 80)));

  const [decisions, auditLogs] = await Promise.all([
    listListingModerationDecisionsByPropertyId({
      propertyId,
      limit: safeLimit,
    }),
    listListingAuditLogsByPropertyId({
      propertyId,
      limit: safeLimit,
    }),
  ]);

  return {
    propertyId,
    decisions,
    auditLogs,
  };
}

export async function listListingDuplicatesByPropertyId(input: {
  propertyId: string;
  limit: number;
  minGroupSize: number;
  includeSemantic?: boolean;
}): Promise<ListingDuplicatesByPropertyResult> {
  const propertyId = input.propertyId.trim();
  const result = await listListingDuplicateGroups({
    limit: input.limit,
    minGroupSize: input.minGroupSize,
    includeResolved: true,
    includeSemantic: input.includeSemantic,
  });

  const groups = result.groups.filter((group) =>
    group.listings.some((listing) => listing.id === propertyId),
  );

  return {
    propertyId,
    groups,
    count: groups.length,
  };
}
