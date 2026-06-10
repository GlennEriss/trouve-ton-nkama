import type {
  ApifyDraftMeta,
  ApifyListingDraft,
  ApifyPipelineResult,
  ApifyRawPost,
  ListingTypeProperty,
} from "../domain/types";
import { hasText, isRealEstatePost, normalizeText } from "./apify-filter.service";

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/* -------------------------------------------------------------------------- */
/* Image extraction                                                           */
/* -------------------------------------------------------------------------- */

/** Strip the query string so the same photo served from different URLs dedups. */
function imageDedupKey(url: string): string {
  const queryIndex = url.indexOf("?");
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

/** Best available URL for a Facebook `Photo` media object. */
function bestPhotoUrl(photo: Record<string, unknown>): string | null {
  const viewer = isRecord(photo.viewer_image) ? toStr(photo.viewer_image.uri) : null;
  const image = isRecord(photo.image) ? toStr(photo.image.uri) : null;
  const thumbnail = toStr(photo.thumbnail);
  return viewer ?? image ?? thumbnail;
}

/**
 * Recursively walk the attachments tree collecting image URLs from every
 * `Photo` media object. Facebook returns the same photos across several
 * subattachment layout buckets (two/three/four/five_photos_subattachments), so
 * we dedup by URL path.
 */
export function extractImageUrls(post: ApifyRawPost): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) {
      return;
    }
    if (node.__typename === "Photo") {
      const url = bestPhotoUrl(node);
      if (url) {
        const key = imageDedupKey(url);
        if (!seen.has(key)) {
          seen.add(key);
          urls.push(url);
        }
      }
    }
    for (const value of Object.values(node)) {
      if (isRecord(value) || Array.isArray(value)) {
        visit(value);
      }
    }
  };

  visit(post.attachments ?? []);
  return urls;
}

// A link that opens the photo within its post context (best), or the post itself.
const POST_URL_RE = /(photo\.php|set=gm\.|\/posts\/|\/permalink\/|story_fbid)/;
// A link to the post's photo album (fallback — still leads to the listing media).
const ALBUM_URL_RE = /media\/set\/\?set=pcb\./;

/**
 * Best available link back to the source post. The Apify Facebook export has no
 * clean post permalink (its `facebookUrl` is the author's profile-in-group), so
 * we mine the attachments for a photo-in-post URL, falling back to the photo
 * album URL. Returns null when the post is text-only with no usable link.
 */
export function extractSourceUrl(post: ApifyRawPost): string | null {
  let albumUrl: string | null = null;

  const visit = (node: unknown): string | null => {
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item);
        if (found) return found;
      }
      return null;
    }
    if (!isRecord(node)) {
      return null;
    }
    for (const value of Object.values(node)) {
      if (typeof value === "string" && value.startsWith("http")) {
        if (POST_URL_RE.test(value)) {
          return value;
        }
        if (albumUrl === null && ALBUM_URL_RE.test(value)) {
          albumUrl = value;
        }
      } else if (isRecord(value) || Array.isArray(value)) {
        const found = visit(value);
        if (found) return found;
      }
    }
    return null;
  };

  return visit(post.attachments ?? []) ?? albumUrl;
}

/* -------------------------------------------------------------------------- */
/* Text parsing                                                               */
/* -------------------------------------------------------------------------- */

/** First non-empty line, trimmed of surrounding whitespace. */
function parseTitle(text: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) {
      return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
    }
  }
  return null;
}

function parseStatus(text: string): "FOR_RENT" | "FOR_SALE" | null {
  const lower = text.toLowerCase();
  const rentIndex = firstIndexOf(lower, ["à louer", "a louer", "louer", "location", "loyer"]);
  const saleIndex = firstIndexOf(lower, ["à vendre", "a vendre", "en vente", "vente", "vendre"]);

  if (rentIndex === -1 && saleIndex === -1) return null;
  if (rentIndex === -1) return "FOR_SALE";
  if (saleIndex === -1) return "FOR_RENT";
  return rentIndex <= saleIndex ? "FOR_RENT" : "FOR_SALE";
}

function firstIndexOf(haystack: string, needles: string[]): number {
  let best = -1;
  for (const needle of needles) {
    const index = haystack.indexOf(needle);
    if (index !== -1 && (best === -1 || index < best)) {
      best = index;
    }
  }
  return best;
}

// Ordered: the earliest-appearing keyword in the text wins.
const TYPE_KEYWORDS: Array<{ keywords: string[]; type: ListingTypeProperty }> = [
  { keywords: ["studio"], type: "Studio" },
  { keywords: ["appartement", "appart", "apartment"], type: "Apartment" },
  { keywords: ["villa"], type: "Villa" },
  { keywords: ["duplex", "maison"], type: "Home" },
  { keywords: ["terrain", "parcelle"], type: "Land" },
  { keywords: ["boutique", "magasin"], type: "Shop" },
  { keywords: ["immeuble"], type: "Building" },
  { keywords: ["bureau"], type: "Desk" },
  { keywords: ["chambre"], type: "Room" },
];

function parseTypeProperty(text: string): ListingTypeProperty | null {
  const lower = text.toLowerCase();
  let bestIndex = -1;
  let bestType: ListingTypeProperty | null = null;
  for (const { keywords, type } of TYPE_KEYWORDS) {
    const index = firstIndexOf(lower, keywords);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestType = type;
    }
  }
  return bestType;
}

// A monetary amount followed by a currency token: grouped thousands
// (230.000 / 230 000) or a 4+ digit number. The currency requirement keeps
// phone numbers from being read as prices.
const CURRENCY_AMOUNT_RE = /(\d{1,3}(?:[.\s]\d{3})+|\d{4,})\s*(?:xaf|fcfa|f\s?cfa|cfa|frs?|f)\b/gi;

// An amount written with a magnitude word: "160mil", "200 milles", "3 millions",
// "230k". A bare "m" is intentionally NOT a multiplier, so "200 m²" is never
// read as 200 millions.
const MAGNITUDE_AMOUNT_RE = /(\d+(?:[.,]\d+)?)\s*(millions?|milles?|mil|k)\b/gi;

// A bare amount with no currency or magnitude word: grouped thousands
// (65.000 / 65 000) or a 4+ digit number. Accepted only when a price keyword
// sits nearby (see parsePrice) — otherwise it would catch phones/dates/areas.
const BARE_AMOUNT_RE = /(\d{1,3}(?:[.\s]\d{3})+|\d{4,})/g;

function normalizeAmount(raw: string): number {
  return Number(raw.replace(/[.\s]/g, ""));
}

function magnitudeMultiplier(word: string): number {
  return word.startsWith("million") ? 1_000_000 : 1_000;
}

/**
 * Pick the listing price from amounts written either with a currency token or a
 * magnitude word. Amounts whose context mentions "visite/caution/commission"
 * are skipped; an amount near "loyer/prix/vente/location/mois" wins; otherwise
 * the largest remaining amount is used.
 */
function parsePrice(text: string): number | null {
  const lower = text.toLowerCase();
  const candidates: Array<{ value: number; index: number; priority: boolean }> = [];

  const lastRegexIndex = (haystack: string, re: RegExp) => {
    let last = -1;
    for (const match of haystack.matchAll(re)) last = match.index ?? last;
    return last;
  };

  // "visite(?!ur)" matches the viewing fee "visite" but NOT "visiteur" (a WC /
  // room feature) — otherwise "douche visiteur" before a price excludes it.
  const consider = (value: number, index: number, requirePriceContext = false) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const context = lower.slice(Math.max(0, index - 40), index);
    // The label closest to the amount wins: a "visite/caution" fee right before
    // the amount excludes it, even if a "loyer" appeared earlier (or vice versa).
    const excludeAt = lastRegexIndex(context, /visite(?!ur)|caution|commission/g);
    const priceAt = lastRegexIndex(context, /loyer|prix|vente|location|mois|nuit|tarif|forfait/g);
    if (excludeAt > priceAt) return;
    const priority = priceAt !== -1;
    if (requirePriceContext && !priority) return;
    candidates.push({ value, index, priority });
  };

  for (const match of lower.matchAll(CURRENCY_AMOUNT_RE)) {
    consider(normalizeAmount(match[1]), match.index ?? 0);
  }
  for (const match of lower.matchAll(MAGNITUDE_AMOUNT_RE)) {
    const base = Number(match[1].replace(",", "."));
    consider(base * magnitudeMultiplier(match[2]), match.index ?? 0);
  }
  // Bare amounts qualify only with a nearby price keyword.
  for (const match of lower.matchAll(BARE_AMOUNT_RE)) {
    consider(normalizeAmount(match[1]), match.index ?? 0, true);
  }

  if (candidates.length === 0) return null;
  // Earliest prioritized amount (the asking price usually leads the post).
  const prioritized = candidates
    .filter((candidate) => candidate.priority)
    .sort((a, b) => a.index - b.index)[0];
  if (prioritized) return prioritized.value;
  return candidates.reduce((max, candidate) => (candidate.value > max ? candidate.value : max), 0);
}

function parseArea(text: string): number | null {
  const match = text.match(/(\d{2,4})\s*m(?:²|2)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseCountAfter(text: string, unitPattern: string): number | null {
  const match = text.match(new RegExp(`(\\d{1,2})\\s*${unitPattern}`, "i"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Gabonese phone number: optional +241 prefix, a leading 0 then 6–7 more digits
// (8–9 total — both lengths are in use), in any common grouping (2-2-2, 3-3-3,
// 2-2-2-2, or no spaces at all). Inter-digit separators may repeat ("16  03").
const PHONE_RE = /(?:\+?241[\s.\-]?)?0[1-9](?:[\s.\-]*\d){6,7}/;

function parseContact(text: string): string | null {
  const match = text.match(PHONE_RE);
  return match ? match[0].trim() : null;
}

function parseTags(text: string): string[] {
  const matches = text.match(/#[\p{L}\d_]+/gu) ?? [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of matches) {
    const tag = raw.slice(1);
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

// Main Gabon cities and their province, used for best-effort localisation.
const CITY_TO_PROVINCE: Array<{ city: string; province: string }> = [
  { city: "Libreville", province: "Estuaire" },
  { city: "Akanda", province: "Estuaire" },
  { city: "Owendo", province: "Estuaire" },
  { city: "Ntoum", province: "Estuaire" },
  { city: "Port-Gentil", province: "Ogooué-Maritime" },
  { city: "Gamba", province: "Ogooué-Maritime" },
  { city: "Omboué", province: "Ogooué-Maritime" },
  { city: "Franceville", province: "Haut-Ogooué" },
  { city: "Moanda", province: "Haut-Ogooué" },
  { city: "Okondja", province: "Haut-Ogooué" },
  { city: "Oyem", province: "Woleu-Ntem" },
  { city: "Bitam", province: "Woleu-Ntem" },
  { city: "Mitzic", province: "Woleu-Ntem" },
  { city: "Lambaréné", province: "Moyen-Ogooué" },
  { city: "Mouila", province: "Ngounié" },
  { city: "Tchibanga", province: "Nyanga" },
  { city: "Koulamoutou", province: "Ogooué-Lolo" },
  { city: "Makokou", province: "Ogooué-Ivindo" },
];

function parseCityProvince(text: string): { city: string | null; province: string | null } {
  const lower = text.toLowerCase();
  for (const { city, province } of CITY_TO_PROVINCE) {
    if (lower.includes(city.toLowerCase())) {
      return { city, province };
    }
  }
  return { city: null, province: null };
}

/**
 * Best-effort locality/street. Facebook listings usually carry a 📍 line such as
 * "📍 Situé à Mindoubé 1 (Auberge Sassou)"; we take that line, stripped of the
 * pin emoji and common "situé à" lead-in.
 */
function parseStreet(text: string): string | null {
  for (const line of text.split("\n")) {
    if (line.includes("📍")) {
      const cleaned = line
        .replace(/📍/g, "")
        .replace(/situ[ée]\s+[àa]\s+/i, "")
        .trim();
      if (cleaned) {
        return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
      }
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Transformation                                                             */
/* -------------------------------------------------------------------------- */

const MISSING_FIELD_LABELS: Array<{ key: keyof ApifyListingDraft; label: string }> = [
  { key: "title", label: "Titre" },
  { key: "typeProperty", label: "Type de bien" },
  { key: "status", label: "Statut (location/vente)" },
  { key: "price", label: "Prix" },
  { key: "city", label: "Ville" },
  { key: "contact", label: "Contact" },
];

/** Transform a single (already-filtered) post into a draft with diagnostics. */
export function transformPost(post: ApifyRawPost): ApifyDraftMeta {
  const original = (post.text ?? "").trim();
  // Parse and display on normalized text so stylized "fancy font" posts are read
  // correctly (e.g. "𝟐𝟎𝟎 𝐦𝐢𝐥𝐥𝐞𝐬" → "200 milles"). rawText keeps the original.
  const text = normalizeText(original).trim();
  const { city, province } = parseCityProvince(text);
  const imageUrls = extractImageUrls(post);

  const draft: ApifyListingDraft = {
    title: parseTitle(text),
    description: text || null,
    typeProperty: parseTypeProperty(text),
    status: parseStatus(text),
    price: parsePrice(text),
    area: parseArea(text),
    city,
    province,
    street: parseStreet(text),
    contact: parseContact(text),
    nbrRooms: parseCountAfter(text, "chambres?"),
    nbrLivingRoom: parseCountAfter(text, "salons?"),
    nbrKitchens: parseCountAfter(text, "cuisines?"),
    nbrBathrooms: parseCountAfter(text, "douches?|salles? de bain"),
    nbrToilets: parseCountAfter(text, "toilettes?|wc"),
    tags: parseTags(text),
    imageUrls,
    source: {
      postUrl: extractSourceUrl(post),
      authorUrl: toStr(post.facebookUrl),
      authorName: post.user ? toStr(post.user.name) : null,
      authorId: post.user ? toStr(post.user.id) : null,
      rawText: original,
    },
  };

  const missingFields = MISSING_FIELD_LABELS.filter(({ key }) => draft[key] == null).map(
    ({ label }) => label,
  );

  const warnings: string[] = [];
  if (imageUrls.length === 0) {
    warnings.push("Aucune image détectée dans le post.");
  }
  if (draft.province == null && draft.city != null) {
    warnings.push("Province non déduite de la ville.");
  }

  return { draft, missingFields, warnings };
}

/**
 * Run the full pipeline on parsed posts: drop empty-text posts, drop
 * non-real-estate posts, transform the rest into drafts. Nothing is persisted.
 */
export function runApifyPipeline(posts: ApifyRawPost[]): ApifyPipelineResult {
  let droppedEmptyText = 0;
  let droppedNotRealEstate = 0;
  const drafts: ApifyDraftMeta[] = [];

  for (const post of posts) {
    if (!hasText(post)) {
      droppedEmptyText += 1;
      continue;
    }
    if (!isRealEstatePost(post)) {
      droppedNotRealEstate += 1;
      continue;
    }
    drafts.push(transformPost(post));
  }

  return {
    drafts,
    stats: {
      totalPosts: posts.length,
      droppedEmptyText,
      droppedNotRealEstate,
      keptRealEstate: drafts.length,
    },
  };
}
