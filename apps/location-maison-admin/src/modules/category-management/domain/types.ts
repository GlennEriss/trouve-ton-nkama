export type CategoryAttributeType = "text" | "number" | "enum" | "boolean";

export type CategoryAttributeSchemaField = {
  key: string;
  label: string;
  type: CategoryAttributeType;
  options?: string[];
  required: boolean;
  facetable: boolean;
  searchable: boolean;
  showOnCard: boolean;
  primary: boolean;
};

export type CategoryImageRatio = "4:3" | "1:1" | "4:5";
export type CategoryLocationPrecision = "exact" | "city" | "none";
export type CategoryDefaultDensity = "showcase" | "standard" | "compact";

export type ListingCategory = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  attributeSchema: CategoryAttributeSchemaField[];
  imageRatio: CategoryImageRatio;
  locationPrecision: CategoryLocationPrecision;
  hasMapView: boolean;
  defaultDensity: CategoryDefaultDensity;
  defaultSort: string;
  minListingsForHomeSection: number;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ListingCategoryPatch = {
  parentId?: string | null;
  slug?: string;
  name?: string;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
  attributeSchema?: CategoryAttributeSchemaField[];
  imageRatio?: CategoryImageRatio;
  locationPrecision?: CategoryLocationPrecision;
  hasMapView?: boolean;
  defaultDensity?: CategoryDefaultDensity;
  defaultSort?: string;
  minListingsForHomeSection?: number;
};

export type CreateListingCategoryInput = {
  parentId: string | null;
  slug: string;
  name: string;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
  attributeSchema?: CategoryAttributeSchemaField[];
  imageRatio?: CategoryImageRatio;
  locationPrecision?: CategoryLocationPrecision;
  hasMapView?: boolean;
  defaultDensity?: CategoryDefaultDensity;
  defaultSort?: string;
  minListingsForHomeSection?: number;
  actorUid: string;
};

export type UpdateListingCategoryInput = {
  categoryId: string;
  patch: ListingCategoryPatch;
  actorUid: string;
};
