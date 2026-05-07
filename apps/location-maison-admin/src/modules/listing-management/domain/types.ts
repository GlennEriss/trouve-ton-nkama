export type ListingStatusFilter = "all" | "FOR_RENT" | "FOR_SALE";
export type ListingStateFilter = "all" | "IN_PROGRESS" | "ARCHIVED";

export type ListingListItem = {
  id: string;
  title: string;
  description: string;
  typeProperty: string | null;
  status: "FOR_RENT" | "FOR_SALE" | null;
  state: "IN_PROGRESS" | "ARCHIVED" | string | null;
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
  createdAt: string | null;
  updatedAt: string | null;
};

export type ListingDetails = ListingListItem & {
  street: string | null;
  countryCode: string | null;
  longitude: number | null;
  latitude: number | null;
  isLocExact: boolean | null;
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
    limit: number;
  };
  summary: {
    inProgressCount: number;
    archivedCount: number;
    forRentCount: number;
    forSaleCount: number;
  };
};

export type UpdateListingInput = {
  propertyId: string;
  actorUid: string;
  patch: {
    title?: string;
    description?: string;
    typeProperty?: string;
    status?: "FOR_RENT" | "FOR_SALE";
    price?: number;
    area?: number;
    street?: string;
    city?: string;
    province?: string;
    country?: string;
    countryCode?: string;
    contact?: string;
    tags?: string[];
    longitude?: number;
    latitude?: number;
    isLocExact?: boolean;
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
  state: "IN_PROGRESS" | "ARCHIVED";
};

export type UpdateListingStateResult = {
  before: ListingDetails;
  after: ListingDetails;
};

export type BulkUpdateListingStateInput = {
  propertyIds: string[];
  actorUid: string;
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

export type ListingDuplicateReason = "same_signature" | "same_primary_image";

export type ListingDuplicateResolutionAction =
  | "not_duplicate"
  | "confirm_duplicate"
  | "archive_target"
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
  listings: ListingDuplicateItem[];
  resolution: ListingDuplicateResolution | null;
};

export type ListListingDuplicateGroupsInput = {
  limit: number;
  minGroupSize: number;
  includeResolved?: boolean;
};

export type ListListingDuplicateGroupsResult = {
  groups: ListingDuplicateGroup[];
  scanned: number;
  returned: number;
  resolvedCount: number;
  unresolvedCount: number;
};

export type GetListingDuplicateClusterInput = {
  clusterId: string;
  limit: number;
  minGroupSize: number;
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
};

export type ResolveListingDuplicateClusterResult = {
  cluster: ListingDuplicateGroup;
  action: ListingDuplicateResolutionAction;
  archivedListingId: string | null;
  previousTargetState: string | null;
  nextTargetState: string | null;
};

export type RecomputeListingDuplicateGroupsInput = {
  limit: number;
  minGroupSize: number;
  includeResolved?: boolean;
};
