// Domain types for the Apify module.
//
// The Apify Facebook scraper exports an array of posts. We parse that JSON,
// keep only real-estate posts, then transform each into a best-effort draft of
// a platform listing (collection `properties`). Drafts are NOT persisted yet —
// Firestore write + Storage upload will be a later step.

/** Author block as returned by the Apify Facebook scraper. */
export type ApifyRawUser = {
  id?: string;
  name?: string;
};

/** A single post as returned by the Apify Facebook scraper. */
export type ApifyRawPost = {
  facebookUrl?: string;
  text?: string;
  user?: ApifyRawUser;
  likesCount?: number;
  commentsCount?: number;
  // Attachments are deeply nested and inconsistent; kept loose on purpose.
  attachments?: unknown[];
};

/** Result of parsing the pasted JSON string. */
export type ApifyParseResult =
  | { ok: true; posts: ApifyRawPost[] }
  | { ok: false; error: string };

/**
 * Property type values aligned with the platform listing form
 * (see dashboard/listings/new — PROPERTY_TYPE_OPTIONS).
 */
export type ListingTypeProperty =
  | "Home"
  | "Studio"
  | "Apartment"
  | "Villa"
  | "Room"
  | "Land"
  | "Shop"
  | "Building"
  | "Desk"
  | "Kiosk";

/** Provenance of a draft, kept for review and later persistence. */
export type ApifyDraftSource = {
  // Best available link back to the post content. The Apify export has no clean
  // post permalink, so this is the photo-in-post URL (photo.php?…set=gm.…) when
  // present, otherwise the photo album URL (media/set/?set=pcb.…), else null.
  postUrl: string | null;
  // Author profile-in-group URL (the scraper's `facebookUrl`). NOT the post.
  authorUrl: string | null;
  authorName: string | null;
  authorId: string | null;
  rawText: string;
};

/**
 * A platform listing draft inferred from a Facebook post. Mirrors the fields of
 * `ListingDetails` we can reasonably infer; everything is nullable since
 * extraction is best-effort.
 */
export type ApifyListingDraft = {
  title: string | null;
  description: string | null;
  typeProperty: ListingTypeProperty | null;
  status: "FOR_RENT" | "FOR_SALE" | null;
  price: number | null;
  area: number | null;
  city: string | null;
  province: string | null;
  street: string | null;
  contact: string | null;
  nbrRooms: number | null;
  nbrLivingRoom: number | null;
  nbrKitchens: number | null;
  nbrBathrooms: number | null;
  nbrToilets: number | null;
  tags: string[];
  // Remote (fbcdn) image URLs. Will be downloaded + re-uploaded to Storage later.
  imageUrls: string[];
  source: ApifyDraftSource;
};

/** A draft plus extraction diagnostics surfaced to the reviewer. */
export type ApifyDraftMeta = {
  draft: ApifyListingDraft;
  // Human-readable labels of key fields that could not be extracted.
  missingFields: string[];
  // Non-blocking notes about the extraction.
  warnings: string[];
};

/** Counters describing what the épuration step did. */
export type ApifyPipelineStats = {
  totalPosts: number;
  droppedEmptyText: number;
  droppedNotRealEstate: number;
  keptRealEstate: number;
};

/** Full result of running the paste → purify → transform pipeline. */
export type ApifyPipelineResult = {
  drafts: ApifyDraftMeta[];
  stats: ApifyPipelineStats;
};
