// Domain types for the Apify module.
//
// The Apify Facebook scraper exports an array of posts. We parse that JSON,
// keep only real-estate posts, then transform each into a best-effort draft of
// a platform listing (collection `properties`). Drafts are NOT persisted yet —
// Firestore write + Storage upload will be a later step.

import type { Property, TypeProperty } from "./platform-listing";

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
 * A platform listing draft inferred from a Facebook post.
 *
 * It is a real platform `Property` (exact field names/types — see
 * {@link platform-listing}), with the type-specific fields of the detected
 * subtype set. Required fields that could not be extracted are filled with
 * defaults (0 / "" / false, coords 0/0, country Gabon/GA, state IN_PROGRESS)
 * and reported in {@link ApifyDraftMeta.missingFields}. When the property kind
 * is undetected, `typeProperty` is `""` (and flagged as missing).
 *
 * The type-specific fields are declared optional here so a single type can hold
 * any subtype; each produced value contains only the fields of its subtype.
 */
export type ApifyListingDraft = Omit<Property, "typeProperty"> & {
  typeProperty: TypeProperty | "";
  // Logement
  nbrRooms?: number;
  nbrKitchens?: number;
  nbrBathrooms?: number;
  nbrToilets?: number;
  // Home / Villa
  nbrFloors?: number;
  nbrGarages?: number;
  nbrLivingRoom?: number;
  nbrPiscine?: number;
  // Studio
  nbrFloorStudio?: number;
  numeroStudio?: string;
  // Apartment
  nbrFloorApartment?: number;
  numeroApartment?: string;
  // Building
  nbrApartments?: number;
  hasParking?: boolean;
  // Desk / Shop / Warehouse
  nbrToilet?: number;
  nbrSections?: number;
  // Kiosk / Room
  kioskType?: string;
  roomType?: string;
  // Provenance — not part of the platform model, dropped before persistence.
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
