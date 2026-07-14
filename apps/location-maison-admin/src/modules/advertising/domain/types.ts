/**
 * Régie publicitaire (concierge) — types du domaine.
 * Aligné sur la plateforme `location-maison` (collections partagées
 * `ad_campaigns` / `advertisers`). Voir docs/REGIE-PUBLICITAIRE-CONCIERGE-SPEC.md
 */

export type AdPlacement =
  | "search_infeed"
  | "property_detail"
  | "home"
  | "immobilier_infeed"
  | "reels_infeed";

export const AD_PLACEMENTS: AdPlacement[] = [
  "search_infeed",
  "property_detail",
  "home",
  "immobilier_infeed",
  "reels_infeed",
];

export type AdCampaignStatus =
  | "draft"
  | "pending_review"
  | "scheduled"
  | "active"
  | "paused"
  | "ended"
  | "rejected";

export type AdBillingMode = "admin_amount" | "user_credits";
export type AdPaymentStatus = "unpaid" | "paid" | "refunded";

export type AdBilling = {
  mode: AdBillingMode;
  amount?: number;
  currency?: "XAF";
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string | null;
  paymentStatus: AdPaymentStatus;
  creditsUsed?: number;
};

export type AdAsset = {
  imagePATH?: string;
  imageURL: string;
};

/** Visuels adaptés par emplacement (optionnel). Repli sur `imageURL` par défaut. */
export type AdAssets = Partial<Record<AdPlacement, AdAsset>>;

export type AdCreative = {
  imagePATH?: string;
  imageURL: string;
  assets?: AdAssets;
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

/**
 * Regroupement des emplacements par FORME de visuel, pour le formulaire :
 * l'annonceur fournit un visuel par format, appliqué à tous les emplacements
 * du groupe. Ratio conseillé indicatif.
 */
export type AdFormatKey = "hero" | "infeed" | "detail" | "reels";

export const AD_FORMATS: ReadonlyArray<{
  key: AdFormatKey;
  label: string;
  ratioHint: string;
  recommended: string;
  placements: AdPlacement[];
}> = [
  { key: "hero", label: "Bannière accueil", ratioHint: "paysage ~3:1", recommended: "1200×400", placements: ["home"] },
  {
    key: "infeed",
    label: "Bannière in-feed (recherche / immobilier)",
    ratioHint: "large ~16:5",
    recommended: "1200×375",
    placements: ["search_infeed", "immobilier_infeed"],
  },
  { key: "detail", label: "Bannière détail annonce", ratioHint: "large ~4:1", recommended: "1200×300", placements: ["property_detail"] },
  { key: "reels", label: "Pub plein écran réels", ratioHint: "portrait ~4:5", recommended: "1080×1350", placements: ["reels_infeed"] },
];

export type AdTargeting = {
  provinces?: string[];
  cities?: string[];
};

export type AdMetrics = {
  impressions: number;
  clicks: number;
};

export type Advertiser = {
  id: string;
  name: string;
  businessName?: string;
  contactPhone?: string;
  contactEmail?: string;
  ownerUid?: string | null;
  createdByAdminUid?: string;
  notes?: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdCampaign = {
  id: string;
  advertiserId?: string | null;
  title: string;
  creative: AdCreative;
  placements: AdPlacement[];
  targeting?: AdTargeting | null;
  startDate: string | null;
  endDate: string | null;
  status: AdCampaignStatus;
  priority: number;
  billing: AdBilling;
  createdByAdminUid?: string;
  metrics: AdMetrics;
  createdAt: string | null;
  updatedAt: string | null;
};

/** ===================== Inputs ===================== */

export type CreateAdvertiserInput = {
  name: string;
  businessName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  actorUid: string;
};

export type ListAdvertisersResult = {
  advertisers: Advertiser[];
  count: number;
};

export type CreateAdCampaignInput = {
  advertiserId?: string | null;
  title: string;
  creative: AdCreative;
  placements: AdPlacement[];
  targeting?: AdTargeting | null;
  startDate: string; // ISO
  endDate: string; // ISO
  priority?: number;
  actorUid: string;
};

export type UpdateAdCampaignInput = {
  id: string;
  title?: string;
  creative?: AdCreative;
  placements?: AdPlacement[];
  targeting?: AdTargeting | null;
  startDate?: string;
  endDate?: string;
  priority?: number;
  status?: AdCampaignStatus;
  actorUid: string;
};

export type RecordPaymentInput = {
  id: string;
  amount: number;
  currency?: "XAF";
  paymentMethod: string;
  paymentReference?: string;
  actorUid: string;
};

export type CampaignStatusFilter = "all" | AdCampaignStatus;
export type PlacementFilter = "all" | AdPlacement;

export type ListAdCampaignsInput = {
  status?: CampaignStatusFilter;
  placement?: PlacementFilter;
  advertiserId?: string;
};

export type ListAdCampaignsResult = {
  campaigns: AdCampaign[];
  count: number;
  summary: {
    active: number;
    scheduled: number;
    pendingReview: number;
    ended: number;
    totalPaidAmount: number;
  };
};
