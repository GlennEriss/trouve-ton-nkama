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

export type UpdateListingStateInput = {
  propertyId: string;
  actorUid: string;
  state: "IN_PROGRESS" | "ARCHIVED";
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

export type ListingDuplicateGroup = {
  fingerprint: string;
  reason: "same_signature" | "same_primary_image";
  confidence: number;
  listings: ListingDuplicateItem[];
};

export type ListListingDuplicateGroupsInput = {
  limit: number;
  minGroupSize: number;
};

export type ListListingDuplicateGroupsResult = {
  groups: ListingDuplicateGroup[];
  scanned: number;
  returned: number;
};
