import type { ModerationStatus } from "@trouve-ton-nkama/core/domain";

export type ListingStatusFilter = "all" | "FOR_RENT" | "FOR_SALE";
export type ListingStateFilter = "all" | "IN_PROGRESS" | "ARCHIVED";
// Distinct de ListingStateFilter (actif/archivé) : statut de review avant publication.
export type ListingModerationStatusFilter =
  | "all"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";
export type ListingDuplicateStateFilter =
  | "all"
  | "suspected"
  | "confirmed"
  | "resolved";

export type ListingListItem = {
  id: string;
  title: string;
  description: string;
  typeProperty: string | null;
  status: "FOR_RENT" | "FOR_SALE" | null;
  isOwner: boolean | null;
  state: "IN_PROGRESS" | "ARCHIVED" | string | null;
  moderationStatus: ModerationStatus | null;
  rejectionReason: string | null;
  price: number | null;
  area: number | null;
  city: string | null;
  province: string | null;
  country: string | null;
  createdBy: string | null;
  contact: string | null;
  tags: string[];
  primaryImageUrl: string | null;
  imageCount: number;
  // Posé par la Cloud Function onListingApprovedPublishToFacebook au moment de
  // l'approbation (voir functions/src/social/), toutes catégories confondues — absent tant
  // que l'annonce n'a pas encore été publiée sur la Page.
  facebookPostId: string | null;
  duplicateState?: "suspected" | "confirmed" | "resolved" | "none";
  createdAt: string | null;
  updatedAt: string | null;
};

export type ListingDetails = ListingListItem & {
  street: string | null;
  countryCode: string | null;
  additionnalInformation: string | null;
  longitude: number | null;
  latitude: number | null;
  provinceLon: number | null;
  provinceLat: number | null;
  cityLon: number | null;
  cityLat: number | null;
  streetLon: number | null;
  streetLat: number | null;
  isLocExact: boolean | null;
  nbrRooms: number | null;
  nbrKitchens: number | null;
  nbrBathrooms: number | null;
  nbrToilets: number | null;
  nbrGarages: number | null;
  nbrFloors: number | null;
  nbrLivingRoom: number | null;
  nbrFloorStudio: number | null;
  numeroStudio: string | null;
  nbrFloorApartment: number | null;
  numeroApartment: string | null;
  nbrPiscine: number | null;
  nbrApartments: number | null;
  hasParking: boolean | null;
  nbrToilet: number | null;
  kioskType: string | null;
  roomType: string | null;
  images: Array<{
    fileURL: string;
    filePATH: string;
  }>;
  extra: Record<string, unknown>;
};

export type ListListingsInput = {
  limit: number;
  cursor?: string;
  query?: string;
  status?: ListingStatusFilter;
  state?: ListingStateFilter;
  createdBy?: string;
  typeProperty?: string[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  province?: string[];
  city?: string[];
  dateFrom?: string;
  dateTo?: string;
  duplicateState?: ListingDuplicateStateFilter;
};

export type ListListingsResult = {
  listings: ListingListItem[];
  count: number;
  totalCount: number | null;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  filters: {
    query: string;
    status: ListingStatusFilter;
    state: ListingStateFilter;
    createdBy: string | null;
    typeProperty: string[];
    priceMin: number | null;
    priceMax: number | null;
    areaMin: number | null;
    areaMax: number | null;
    province: string[];
    city: string[];
    dateFrom: string | null;
    dateTo: string | null;
    duplicateState: ListingDuplicateStateFilter;
    limit: number;
  };
  summary: {
    inProgressCount: number;
    archivedCount: number;
    forRentCount: number;
    forSaleCount: number;
  };
};

export type ListPendingListingsResult = {
  listings: ListingListItem[];
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type UpdateListingModerationStatusInput = {
  propertyId: string;
  actorUid: string;
  decision: "APPROVE" | "REJECT";
  reason?: string;
};

export type UpdateListingModerationStatusResult = {
  before: ListingDetails;
  after: ListingDetails;
};

export type UpdateListingInput = {
  propertyId: string;
  actorUid: string;
  patch: {
    title?: string;
    description?: string;
    typeProperty?: string;
    status?: "FOR_RENT" | "FOR_SALE";
    isOwner?: boolean;
    price?: number;
    area?: number;
    street?: string;
    city?: string;
    province?: string;
    provinceLon?: number;
    provinceLat?: number;
    cityLon?: number;
    cityLat?: number;
    streetLon?: number;
    streetLat?: number;
    additionnalInformation?: string;
    country?: string;
    countryCode?: string;
    contact?: string;
    tags?: string[];
    images?: Array<{
      fileURL: string;
      filePATH?: string;
    }>;
    longitude?: number;
    latitude?: number;
    isLocExact?: boolean;
    nbrRooms?: number;
    nbrKitchens?: number;
    nbrBathrooms?: number;
    nbrToilets?: number;
    nbrGarages?: number;
    nbrFloors?: number;
    nbrLivingRoom?: number;
    nbrFloorStudio?: number;
    numeroStudio?: string;
    nbrFloorApartment?: number;
    numeroApartment?: string;
    nbrPiscine?: number;
    nbrApartments?: number;
    hasParking?: boolean;
    nbrToilet?: number;
    kioskType?: string;
    roomType?: string;
  };
};

export type UpdateListingResult = {
  before: ListingDetails;
  after: ListingDetails;
  patch: Record<string, unknown>;
};

export type UpdateListingStateInput = {
  propertyId: string;
  actorUid: string;
  reason?: string;
  state: "IN_PROGRESS" | "ARCHIVED";
};

export type UpdateListingStateResult = {
  before: ListingDetails;
  after: ListingDetails;
};

export type UpdateListingStatusInput = {
  propertyId: string;
  actorUid: string;
  reason?: string;
  status: "FOR_RENT" | "FOR_SALE";
};

export type UpdateListingStatusResult = {
  before: ListingDetails;
  after: ListingDetails;
};

export type BulkUpdateListingStateInput = {
  propertyIds: string[];
  actorUid: string;
  reason?: string;
  state: "IN_PROGRESS" | "ARCHIVED";
};

export type BulkUpdateListingStateResult = {
  state: "IN_PROGRESS" | "ARCHIVED";
  requestedCount: number;
  updatedCount: number;
  notFoundCount: number;
  failedCount: number;
  updated: Array<{
    id: string;
    beforeState: string | null;
    afterState: string | null;
  }>;
  notFoundIds: string[];
  failed: Array<{
    id: string;
    reason: string;
  }>;
};

export type BulkUpdateListingStatusInput = {
  propertyIds: string[];
  actorUid: string;
  reason?: string;
  status: "FOR_RENT" | "FOR_SALE";
};

export type BulkUpdateListingStatusResult = {
  status: "FOR_RENT" | "FOR_SALE";
  requestedCount: number;
  updatedCount: number;
  notFoundCount: number;
  failedCount: number;
  updated: Array<{
    id: string;
    beforeStatus: "FOR_RENT" | "FOR_SALE" | null;
    afterStatus: "FOR_RENT" | "FOR_SALE" | null;
  }>;
  notFoundIds: string[];
  failed: Array<{
    id: string;
    reason: string;
  }>;
};

export type ListingDuplicateItem = {
  id: string;
  title: string;
  createdBy: string | null;
  price: number | null;
  status: "FOR_RENT" | "FOR_SALE" | null;
  state: string | null;
  city: string | null;
  province: string | null;
  primaryImageUrl: string | null;
  createdAt: string | null;
};

export type ListingDuplicateReason =
  | "same_signature"
  | "same_primary_image"
  | "semantic_similarity";

export type ListingDuplicateResolutionAction =
  | "not_duplicate"
  | "confirm_duplicate"
  | "archive_target"
  | "keep_one_archive_others"
  | "needs_review";

export type ListingDuplicateResolution = {
  action: ListingDuplicateResolutionAction;
  note: string | null;
  targetListingId: string | null;
  actorUid: string;
  actorRoles: string[];
  reviewedAt: string | null;
};

export type ListingDuplicateGroup = {
  clusterId: string;
  fingerprint: string;
  reason: ListingDuplicateReason;
  confidence: number;
  semanticScore: number | null;
  scoreBreakdown: {
    textScore: number | null;
    priceScore: number | null;
    locationScore: number | null;
  } | null;
  listings: ListingDuplicateItem[];
  resolution: ListingDuplicateResolution | null;
};

export type ListListingDuplicateGroupsInput = {
  limit: number;
  minGroupSize: number;
  includeResolved?: boolean;
  includeSemantic?: boolean;
};

export type ListListingDuplicateGroupsResult = {
  groups: ListingDuplicateGroup[];
  scanned: number;
  returned: number;
  resolvedCount: number;
  unresolvedCount: number;
  semanticGroupsCount: number;
  matchingVersion: string;
};

export type GetListingDuplicateClusterInput = {
  clusterId: string;
  limit: number;
  minGroupSize: number;
  includeSemantic?: boolean;
};

export type GetListingDuplicateClusterResult = {
  cluster: ListingDuplicateGroup;
  scanned: number;
};

export type ResolveListingDuplicateClusterInput = {
  clusterId: string;
  action: ListingDuplicateResolutionAction;
  actorUid: string;
  actorRoles: string[];
  note?: string | null;
  targetListingId?: string | null;
  limit: number;
  minGroupSize: number;
  includeSemantic?: boolean;
};

export type ResolveListingDuplicateClusterResult = {
  cluster: ListingDuplicateGroup;
  action: ListingDuplicateResolutionAction;
  archivedListingId: string | null;
  archivedListingIds: string[];
  archivedListingCount: number;
  keptListingId: string | null;
  previousTargetState: string | null;
  nextTargetState: string | null;
};

export type RecomputeListingDuplicateGroupsInput = {
  limit: number;
  minGroupSize: number;
  includeResolved?: boolean;
  includeSemantic?: boolean;
  actorUid?: string;
};

export type RecomputeListingDuplicateGroupsResult =
  ListListingDuplicateGroupsResult & {
    metrics: ListingDedupMonitoringMetrics;
  };

export type ListingDedupAdvancedSettings = {
  semanticEnabled: boolean;
  semanticCandidateThreshold: number;
  semanticClusterThreshold: number;
  textWeight: number;
  priceWeight: number;
  locationWeight: number;
  maxListingsForSemantic: number;
  maxBlockSize: number;
  minTextTokens: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type UpdateListingDedupAdvancedSettingsInput = {
  actorUid: string;
  patch: Partial<
    Omit<ListingDedupAdvancedSettings, "updatedAt" | "updatedBy">
  >;
};

export type ListingDedupMonitoringMetrics = {
  measuredAt: string;
  totalClustersDetected: number;
  semanticClustersDetected: number;
  resolvedClusters: number;
  unresolvedClusters: number;
  truePositiveDecisions: number;
  falsePositiveDecisions: number;
  pendingReviewDecisions: number;
  precision: number | null;
  recallProxy: number | null;
  reviewCoverage: number;
};

export type ListingModerationDecisionType =
  | "APPROVE"
  | "REJECT"
  | "ARCHIVE"
  | "UNARCHIVE"
  | "STATUS_CHANGE"
  | "BULK_ARCHIVE"
  | "BULK_UNARCHIVE"
  | "BULK_STATUS_CHANGE";

export type ListingModerationDecisionItem = {
  id: string;
  propertyId: string;
  decision: ListingModerationDecisionType;
  reason: string;
  beforeState: string | null;
  afterState: string | null;
  beforeStatus: "FOR_RENT" | "FOR_SALE" | null;
  afterStatus: "FOR_RENT" | "FOR_SALE" | null;
  beforeModerationStatus: ModerationStatus | null;
  afterModerationStatus: ModerationStatus | null;
  actorId: string;
  actorRoles: string[];
  correlationId: string | null;
  createdAt: string | null;
};

export type ListingAuditLogItem = {
  id: string;
  action: string;
  status: string | null;
  actorId: string | null;
  actorRoles: string[];
  correlationId: string | null;
  resource: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
  createdAt: string | null;
};

export type ListingModerationHistoryResult = {
  propertyId: string;
  decisions: ListingModerationDecisionItem[];
  auditLogs: ListingAuditLogItem[];
};

export type ListingDuplicatesByPropertyResult = {
  propertyId: string;
  groups: ListingDuplicateGroup[];
  count: number;
};
