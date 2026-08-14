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

export type PromotionType = "featured" | "trending-7d" | "trending-3d" | "boost";

/**
 * Redéfinit crédits/durée d'une promotion pour cette catégorie — voir
 * docs/marketplace-multi-categories/06-monetisation.md : la grille par défaut
 * (property/promote/route.ts) est calibrée pour l'immobilier, où 1500F (15cr) est indolore
 * sur un loyer ; sur un article mode à 15000F c'est 10% du prix, invendable. Une entrée
 * absente pour un type de promotion => la valeur par défaut du code s'applique (pas de
 * redéploiement requis pour ajuster, mais aucune obligation de tout redéfinir non plus).
 */
export type CategoryPromotionPricing = Partial<
  Record<PromotionType, { credits: number; duration: number }>
>;

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
  promotionPricing: CategoryPromotionPricing;
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
  promotionPricing?: CategoryPromotionPricing;
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
  promotionPricing?: CategoryPromotionPricing;
  actorUid: string;
};

export type UpdateListingCategoryInput = {
  categoryId: string;
  patch: ListingCategoryPatch;
  actorUid: string;
};
