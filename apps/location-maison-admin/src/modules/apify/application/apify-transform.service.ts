import type {
  ApifyDraftMeta,
  ApifyDraftSource,
  ApifyListingDraft,
  ApifyPipelineResult,
  ApifyRawPost,
} from "../domain/types";
import type { Image, StatusProperty, TypeProperty } from "../domain/platform-listing";
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

// French label for each property kind (used in titles/descriptions).
const TYPE_LABEL_FR: Record<TypeProperty, string> = {
  Home: "Maison",
  Studio: "Studio",
  Apartment: "Appartement",
  Villa: "Villa",
  Room: "Chambre",
  Land: "Terrain",
  Shop: "Magasin",
  Building: "Immeuble",
  Desk: "Bureau",
  Kiosk: "Kiosque",
  Property: "Logement",
  Logement: "Logement",
  Duplex: "Duplex",
  Warehouse: "Entrepôt",
};

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// Property kinds that carry the Logement counts (rooms/kitchens/baths/toilets).
const LOGEMENT_TYPES = new Set<TypeProperty>(["Home", "Apartment", "Villa", "Studio", "Logement", "Duplex"]);

// Subset of a draft that buildTitle needs (satisfied by ApifyListingDraft).
export type TitleFields = {
  typeProperty: TypeProperty | "" | null;
  status: StatusProperty | null;
  street: string | null;
  city: string | null;
};

/** "{Type} à louer/vendre dans la zone de {quartier}". */
export function buildTitle(fields: TitleFields): string {
  const type = fields.typeProperty ? TYPE_LABEL_FR[fields.typeProperty] : "Bien";
  const action = fields.status === "FOR_SALE" ? "vendre" : "louer";
  const zone = capitalizeFirst((fields.street || fields.city || "").trim());
  return `${type} à ${action}${zone ? ` dans la zone de ${zone}` : ""}`.replace(/\s+/g, " ").trim();
}

// Amenities detected in the post text (beyond the model's numeric fields).
// Ordered; first match per label wins. Patterns run on the normalized text.
const AMENITY_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bsalle ?[\u00e0a] ?manger\b/i, label: "salle \u00e0 manger" },
  { re: /\bwc visiteurs?|toilettes? visiteurs?|douche visiteur/i, label: "WC visiteurs" },
  { re: /\bterrasses?\b/i, label: "terrasse" },
  { re: /\bbalcons?\b/i, label: "balcon" },
  { re: /\bparking\b/i, label: "parking" },
  { re: /\bgardien|vigile|gardiennage\b/i, label: "gardien" },
  { re: /s[\u00e9e]curis|barri[\u00e8e]re|cl[\u00f4o]tur|grille de s[\u00e9e]curit|gris de s[\u00e9e]curit/i, label: "s\u00e9curis\u00e9" },
  { re: /\bsplits?\b|climatis|\bclim\b/i, label: "climatisation" },
  { re: /forage|eau (en )?permanen|eau 24|eau h ?24|eau 7 ?\/ ?7|ch[\u00e2a]teau d.?eau/i, label: "eau permanente" },
  { re: /groupe [\u00e9e]lectrog[\u00e8e]ne|g[\u00e9e]n[\u00e9e]rateur/i, label: "groupe \u00e9lectrog\u00e8ne" },
  { re: /\bascenseur\b/i, label: "ascenseur" },
  { re: /\bjardin\b/i, label: "jardin" },
  { re: /\bmeubl[\u00e9e]/i, label: "meubl\u00e9" },
  { re: /\bplacards?\b|dressing/i, label: "placards" },
  { re: /premi[\u00e8e]re main|jamais habit|\bneuf\b/i, label: "premi\u00e8re main" },
  { re: /bon standing|haut standing|grand standing|standing/i, label: "bon standing" },
];

function parseAmenities(text: string): string[] {
  const found: string[] = [];
  for (const { re, label } of AMENITY_PATTERNS) {
    if (re.test(text) && !found.includes(label)) found.push(label);
  }
  return found;
}

// "1er étage" / "3e étage".
function floorLabel(floor: number): string {
  return `${floor === 1 ? "1er" : `${floor}e`} étage`;
}

/**
 * Clean structured description from the draft's typed attributes (per
 * typeProperty) plus the amenities detected in `text`. No raw dump — the
 * original post is shown separately. Counts come pre-defaulted to 1.
 */
function buildListingDescription(draft: ApifyListingDraft, text: string): string {
  const typeLabel = draft.typeProperty ? TYPE_LABEL_FR[draft.typeProperty] : "Bien";
  const action = draft.status === "FOR_SALE" ? "à vendre" : "à louer";
  const place = capitalizeFirst([draft.street, draft.city, draft.province].filter(Boolean).join(", "));
  const intro = `${typeLabel} ${action}${place ? ` à ${place}` : ""}.`;

  const fr = (n: number, singular: string, plural: string) => `${n} ${n > 1 ? plural : singular}`;
  const features: string[] = [];

  if (draft.typeProperty && LOGEMENT_TYPES.has(draft.typeProperty)) {
    features.push(fr(draft.nbrRooms ?? 1, "chambre", "chambres"));
    if (draft.nbrLivingRoom != null) features.push(fr(draft.nbrLivingRoom, "salon", "salons"));
    features.push(fr(draft.nbrKitchens ?? 1, "cuisine", "cuisines"));
    features.push(fr(draft.nbrBathrooms ?? 1, "salle de bain", "salles de bain"));
    features.push(fr(draft.nbrToilets ?? 1, "toilette", "toilettes"));
  }

  switch (draft.typeProperty) {
    case "Apartment":
      if (draft.numeroApartment) features.push(`appartement n°${draft.numeroApartment}`);
      if (draft.nbrFloorApartment) features.push(floorLabel(draft.nbrFloorApartment));
      break;
    case "Studio":
      if (draft.numeroStudio) features.push(`studio n°${draft.numeroStudio}`);
      if (draft.nbrFloorStudio) features.push(floorLabel(draft.nbrFloorStudio));
      break;
    case "Villa":
      if (draft.nbrFloors) features.push(fr(draft.nbrFloors, "niveau", "niveaux"));
      if (draft.nbrGarages) features.push(fr(draft.nbrGarages, "garage", "garages"));
      if (draft.nbrPiscine) features.push(fr(draft.nbrPiscine, "piscine", "piscines"));
      break;
    case "Home":
    case "Duplex":
      if (draft.nbrFloors) features.push(fr(draft.nbrFloors, "niveau", "niveaux"));
      if (draft.nbrGarages) features.push(fr(draft.nbrGarages, "garage", "garages"));
      break;
    case "Building":
      features.push(fr(draft.nbrApartments ?? 1, "appartement", "appartements"));
      if (draft.nbrFloors) features.push(fr(draft.nbrFloors, "étage", "étages"));
      if (draft.hasParking) features.push("parking");
      break;
    case "Desk":
      features.push(fr(draft.nbrRooms ?? 1, "salle", "salles"));
      features.push(fr(draft.nbrToilets ?? 1, "toilette", "toilettes"));
      break;
    case "Shop":
      features.push(fr(draft.nbrRooms ?? 1, "pièce", "pièces"));
      features.push(fr(draft.nbrToilet ?? 1, "toilette", "toilettes"));
      break;
    case "Warehouse":
      features.push(fr(draft.nbrSections ?? 1, "section", "sections"));
      features.push(fr(draft.nbrToilets ?? 1, "toilette", "toilettes"));
      break;
    case "Kiosk":
      if (draft.kioskType) features.push(`type ${draft.kioskType}`);
      break;
    case "Room":
      if (draft.roomType) features.push(`type ${draft.roomType}`);
      break;
    case "Land":
      if (draft.area) features.push(`${draft.area} m²`);
      break;
  }

  const featuresLine = features.length ? `Caractéristiques : ${features.join(", ")}.` : "";
  const amenities = parseAmenities(text);
  const amenitiesLine = amenities.length ? `Équipements : ${amenities.join(", ")}.` : "";
  const priceLine = draft.price > 0 ? `Prix : ${new Intl.NumberFormat("fr-FR").format(draft.price)} XAF.` : "";

  return [intro, featuresLine, amenitiesLine, priceLine]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Title + description recomposed from a draft's current fields and raw text.
 * Reused after geocoding so both stay in sync with the resolved locality.
 */
export function buildListingContent(draft: ApifyListingDraft): { title: string; description: string } {
  const text = normalizeText(draft.source.rawText);
  return { title: buildTitle(draft), description: buildListingDescription(draft, text) };
}

function parseStatus(text: string): "FOR_RENT" | "FOR_SALE" | null {
  const lower = text.toLowerCase();
  const rentIndex = firstIndexOf(lower, ["#alouer", "alouer", "à louer", "a louer", "louer", "location", "loyer"]);
  const saleIndex = firstIndexOf(lower, ["#avendre", "avendre", "à vendre", "a vendre", "en vente", "vente", "vendre"]);

  if (rentIndex === -1 && saleIndex === -1) return null;
  if (rentIndex === -1) return "FOR_SALE";
  if (saleIndex === -1) return "FOR_RENT";
  return rentIndex <= saleIndex ? "FOR_RENT" : "FOR_SALE";
}

function firstIndexOf(haystack: string, needles: string[]): number {
  let best = -1;
  for (const needle of needles) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = haystack.match(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "iu"));
    const index = match?.index ?? -1;
    if (index !== -1 && (best === -1 || index < best)) {
      best = index;
    }
  }
  return best;
}

// Ordered: the earliest-appearing keyword in the text wins.
const TYPE_KEYWORDS: Array<{ keywords: string[]; type: TypeProperty }> = [
  { keywords: ["studio"], type: "Studio" },
  { keywords: ["appartement", "appart", "apartment"], type: "Apartment" },
  { keywords: ["villa"], type: "Villa" },
  { keywords: ["duplex"], type: "Duplex" },
  { keywords: ["maison"], type: "Home" },
  { keywords: ["terrain", "parcelle"], type: "Land" },
  { keywords: ["entrepôt", "entrepot", "hangar"], type: "Warehouse" },
  { keywords: ["local commercial", "local", "boutique", "magasin"], type: "Shop" },
  { keywords: ["immeuble"], type: "Building" },
  { keywords: ["bureau"], type: "Desk" },
  { keywords: ["kiosque"], type: "Kiosk" },
  { keywords: ["chambre"], type: "Room" },
];

function parseTypeProperty(text: string): TypeProperty | null {
  const lower = text.toLowerCase();
  let bestIndex = -1;
  let bestType: TypeProperty | null = null;
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
const MAGNITUDE_AMOUNT_RE = /(\d+(?:[.,]\d+)?)\s*[.,]?\s*(millions?|milles?|mil|k)\b/gi;

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
    const before = lower.slice(Math.max(0, index - 40), index);
    // Window after the amount catches a trailing price cue ("125000/mois").
    const after = lower.slice(index, index + 30);
    // The label closest before the amount wins: a "visite/caution" fee right
    // before excludes it, even if a "loyer" appeared earlier (or vice versa).
    const excludeAt = lastRegexIndex(before, /visite(?!ur)|caution|commission/g);
    const priceAtBefore = lastRegexIndex(before, /loyer|prix|montant|vente|location|mois|nuit|tarif|forfait/g);
    if (excludeAt > priceAtBefore) return;
    const priceAfter = /\/?\s*(?:mois|par mois|le mois)\b|\bloyer|\bprix|\b(?:avec|sans)\s+charges?\b/.test(after);
    const priority = priceAtBefore !== -1 || priceAfter;
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
  // Group the unit pattern so the count binds to the whole alternation.
  const match = text.match(new RegExp(`(\\d{1,2})\\s*(?:${unitPattern})`, "i"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Gabonese phone number: optional +241 prefix, a leading 0 then 6–7 more digits
// (8–9 total — both lengths are in use), in any common grouping (2-2-2, 3-3-3,
// 2-2-2-2, or no spaces at all). Inter-digit separators may repeat ("16  03").
const PHONE_RE = /(?:\+?241[\s.\-]?)?0[1-9](?:[\s.\-]*\d){6,7}/;

/** Normalize a Gabonese number to "+241 XXX XX XX XX". */
function formatGabonPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("241")) digits = digits.slice(3); // drop country code
  // 9-digit national number (0XX XX XX XX) → grouped 3-2-2-2.
  if (digits.length === 9) {
    return `+241 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  // 8-digit number → grouped 2-2-2-2 (still prefixed).
  if (digits.length === 8) {
    return `+241 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
  }
  return `+241 ${digits}`;
}

function parseContact(text: string): string | null {
  const match = text.match(PHONE_RE);
  return match ? formatGabonPhone(match[0]) : null;
}

// Agency-fee mentions → "Agence". Owner-direct mentions → "Propriétaire".
const AGENCY_RE = /\bagence|commissions?|frais d['’ ]agence|frais de d[ée]marche|frais de dossier/i;
const NO_AGENCY_RE =
  /sans agence|pas d['’ ]agence|aucune agence|directement (?:du|le|de la) propri[ée]taire|particulier [àa] particulier/i;

// Keyword → canonical platform tag (DEFAULT_TAG_NAMES in location-maison).
const TAG_RULES: Array<{ tag: string; re: RegExp }> = [
  { tag: "Meublé", re: /meubl[ée]/i },
  { tag: "Sécurisé", re: /s[ée]curis|gardien|vigile|gris de s[ée]curit|grille de s[ée]curit|cl[ôo]tur/i },
  { tag: "Sous barrière", re: /barri[èe]re/i },
  { tag: "Piscine", re: /piscine/i },
  { tag: "Parking", re: /parking|stationnement/i },
  { tag: "Garage", re: /\bgarages?\b/i },
  { tag: "Balcon", re: /balcon/i },
  { tag: "Terrasse", re: /terrasse/i },
  { tag: "Wi-Fi", re: /wi[- ]?fi|\binternet\b|fibre/i },
  { tag: "Centre-ville", re: /centre[- ]?ville/i },
  { tag: "Collocation", re: /colocation|collocation|\bcoloc\b/i },
  { tag: "Court séjour", re: /court s[ée]jour|nuit[ée]e?|airbnb|par nuit/i },
  { tag: "Vacances", re: /\bvacances\b/i },
  { tag: "Étudiant", re: /[ée]tudiant|campus|universit[ée]/i },
  { tag: "Famille", re: /\bfamille\b|familial/i },
  { tag: "Couple", re: /\bcouple\b/i },
  { tag: "Animaux admis", re: /animaux (?:admis|accept)|chiens? accept/i },
  { tag: "Commerces proches", re: /commerces?|supermarch[ée]/i },
  { tag: "Transport proche", re: /arr[êe]t de bus|transport en commun|station de taxi/i },
  { tag: "Proche de la plage", re: /\bplage\b/i },
  { tag: "Calme et tranquillité", re: /\bcalme\b|tranquill|paisible/i },
  { tag: "Nature", re: /verdure|espace vert/i },
  { tag: "Montagne", re: /montagne/i },
];

/**
 * Curated platform tags inferred from the post. "Agence" is added first when
 * agency fees/commissions are mentioned (else "Propriétaire" for owner-direct),
 * then a type-based tag, then keyword tags. Capped at MAX_TAGS.
 */
function parseTags(text: string, typeProperty: TypeProperty | null): string[] {
  const tags: string[] = [];
  const add = (tag: string) => {
    if (!tags.includes(tag)) tags.push(tag);
  };

  if (NO_AGENCY_RE.test(text)) add("Propriétaire");
  else if (AGENCY_RE.test(text)) add("Agence");

  if (typeProperty === "Villa") add("Villa");
  else if (typeProperty === "Duplex") add("Duplex");
  else if (typeProperty === "Shop") add("Boutique");

  for (const { tag, re } of TAG_RULES) {
    if (re.test(text)) add(tag);
  }

  return tags.slice(0, MAX_TAGS);
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

const KNOWN_QUARTER_ALIASES: Record<string, { street: string; city: string; province: string }> = {
  "akanda angondje": { street: "Angondjé", city: "Akanda", province: "Estuaire" },
  alibandeng: { street: "Alibandeng", city: "Libreville", province: "Estuaire" },
  alibending: { street: "Alibandeng", city: "Libreville", province: "Estuaire" },
  angondje: { street: "Angondjé", city: "Akanda", province: "Estuaire" },
  "akanda marseille 2": { street: "Marseille 2", city: "Akanda", province: "Estuaire" },
  "ambassade du nigeria": { street: "Ambassade du Nigéria", city: "Libreville", province: "Estuaire" },
  bikele: { street: "Bikélé", city: "Owendo", province: "Estuaire" },
  "camp de gaule": { street: "Camp de Gaule", city: "Akanda", province: "Estuaire" },
  "cite magnolia": { street: "Avorbam", city: "Akanda", province: "Estuaire" },
  ens: { street: "ENS", city: "Libreville", province: "Estuaire" },
  essassa: { street: "Essassa", city: "Ntoum", province: "Estuaire" },
  "haut de gue gue": { street: "Haut de Gué-Gué", city: "Libreville", province: "Estuaire" },
  "marseille 2": { street: "Marseille 2", city: "Akanda", province: "Estuaire" },
  nzengayong: { street: "Nzeng Ayong", city: "Libreville", province: "Estuaire" },
  "nzeng ayong": { street: "Nzeng Ayong", city: "Libreville", province: "Estuaire" },
  okala: { street: "Okala", city: "Akanda", province: "Estuaire" },
  "okala canal7": { street: "Okala", city: "Akanda", province: "Estuaire" },
  "okala canal 7": { street: "Okala", city: "Akanda", province: "Estuaire" },
  pk26: { street: "Essassa", city: "Ntoum", province: "Estuaire" },
  pk9: { street: "PK9", city: "Libreville", province: "Estuaire" },
  tsanguete: { street: "Angondjé", city: "Akanda", province: "Estuaire" },
  tsanguetes: { street: "Angondjé", city: "Akanda", province: "Estuaire" },
  tsanguette: { street: "Angondjé", city: "Akanda", province: "Estuaire" },
  tsanguettes: { street: "Angondjé", city: "Akanda", province: "Estuaire" },
};

function normalizeLocationKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/#/g, " ")
    .replace(/[^\p{L}\d]+/gu, " ")
    .trim()
    .toLowerCase();
}

function findKnownQuarterInText(text: string): { street: string; city: string; province: string } | null {
  const normalized = normalizeLocationKey(text);
  for (const [alias, location] of Object.entries(KNOWN_QUARTER_ALIASES)) {
    if (normalized.includes(alias)) return location;
  }
  return null;
}

function isFalseStreetLine(line: string): boolean {
  const normalized = normalizeLocationKey(line);
  return /(?:^|\s)(caracteristiques?|modalites?|montant|infoline|contact|loyer|prix|visite)(?:\s|$)/.test(normalized);
}

function findCityProvinceInText(text: string): { city: string; province: string } | null {
  const lower = text.toLowerCase();
  for (const { city, province } of CITY_TO_PROVINCE) {
    if (lower.includes(city.toLowerCase())) {
      return { city, province };
    }
  }
  return null;
}

function parseCityProvince(text: string): { city: string | null; province: string | null } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const priorityLines = [
    ...lines.filter((line) => STREET_PRIORITY_CUE_RE.test(line)),
    ...lines.filter((line) => line.includes("📍") && !isFalseStreetLine(line)),
  ];

  for (const line of priorityLines) {
    const quarter = findKnownQuarterInText(line);
    if (quarter) return { city: quarter.city, province: quarter.province };

    const result = findCityProvinceInText(line);
    if (result) return result;
  }

  const quarter = findKnownQuarterInText(text);
  if (quarter) return { city: quarter.city, province: quarter.province };

  return findCityProvinceInText(text) ?? { city: null, province: null };
}

// A line that names a locality: a 📍 pin, or a cue word ("situé à", "quartier",
// "derrière", "après", "zone"…). Used as the street value and the geocoding seed.
// Unicode letter lookarounds (not \b): \b is ASCII, so a cue ending in an
// accented letter ("situé", "côté") followed by a space would otherwise fail.
const STREET_CUE_RE =
  /(?<!\p{L})(?:situ[ée]e?s?|sis|implant[ée]e?s?|quartier|lieu|adresse|zone|secteur|derri[èe]re|apr[èe]s|en\s+face|au\s+niveau|carrefour|c[ôo]t[ée])(?!\p{L})/iu;
// Lead-in to strip so only the place name remains. Connectors use a space
// lookahead instead of \b (which mishandles accented letters like "à"), so "a"
// does not match inside "apres" and "à" is still stripped before a space.
const STREET_LEADIN_RE =
  /^.*?\b(?:situ[ée]e?s?(?:\s+(?:[àa]|au|aux|en|vers|apr[èe]s|derri[èe]re|pr[èe]s\s+de|proche\s+de)(?=\s))?|quartier|lieu|adresse|zone|secteur|derri[èe]re|apr[èe]s|pr[èe]s\s+de|proche\s+de|en\s+face\s+de|au\s+niveau\s+de|(?:juste\s+)?[àa]\s+c[ôo]t[ée]\s+(?:de|du|des|de la)|c[ôo]t[ée]\s+(?:de|du|des|de la))(?=\s|:)\s*:?\s*/i;
// Trailing noise to cut off (price/contact clauses after the place name). The
// leading \s+ avoids matching "tel" inside "hôtel".
const STREET_NOISE_RE = /\s+(?:loyer|prix|t[ée]l[ée]?phone|t[ée]l|contact|whatsapp|visite|caution)\b/i;
// Distance/direction/landmark filler after the place name, cut off so only the
// quarter remains ("amissa vers le carrefour" → "amissa", "IAI a quelques pas
// de la route" → "IAI", "X à 3 min de…" → "X").
const STREET_FILLER_RE =
  /\s+(?:vers|[àa]\s+c[ôo]t[ée]|en\s+face|face\s+[àa]|au\s+bord|en\s+voie\s+(?:secondaire|principale)|voie\s+(?:secondaire|principale)|[àa]\s+quelques|quelques\s+(?:pas|min|mn|minutes?|m[èe]tres?)|[àa]\s+\d+\s*(?:min|mn|minutes?|m[èe]tres?|pas)|non\s+loin|pas\s+loin|tout\s+pr[èe]s|en\s+bordure|bordure|acc[èe]s|proche\s+de|pr[èe]s\s+(?:de|du))\b/i;
const STREET_PRIORITY_CUE_RE = /\bzone\s+g[ée]ographique\b/i;
const STREET_PRIORITY_LEADIN_RE = /^.*?\bzone\s+g[ée]ographique\s*:?\s*/i;

/**
 * Best-effort locality/street. Prefers a 📍 line, else the first line carrying a
 * locality cue; strips the pin, leading bullets/emojis and the cue lead-in
 * ("Situé après IAI …" → "IAI …").
 */
function parseStreet(text: string): string | null {
  const knownQuarter = findKnownQuarterInText(text);
  if (knownQuarter) return knownQuarter.street;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const raw =
    lines.find((line) => STREET_PRIORITY_CUE_RE.test(line)) ??
    lines.find((line) => line.includes("📍") && !isFalseStreetLine(line)) ??
    lines.find((line) => STREET_CUE_RE.test(line));
  if (!raw) return null;

  let cleaned = raw
    .replace(/📍/g, "")
    .replace(/^[^\p{L}\d]+/u, "")
    .replace(STREET_PRIORITY_LEADIN_RE, "")
    .replace(STREET_LEADIN_RE, "")
    .replace(/^[^\p{L}\d]+/u, "")
    .trim();
  // Keep only the place name: drop anything after a comma, a price/contact cue,
  // or a distance/direction/landmark filler, then trailing punctuation/emojis.
  cleaned = cleaned.split(/[,\n(]/)[0].split(STREET_NOISE_RE)[0].split(STREET_FILLER_RE)[0].trim();
  cleaned = cleaned.replace(/[^\p{L}\d)]+$/u, "").trim();
  if (/\bprix\s+import\b/i.test(cleaned)) {
    const city = findCityProvinceInText(cleaned);
    if (city) return city.city;
  }
  const cleanedKnownQuarter = findKnownQuarterInText(cleaned);
  if (cleanedKnownQuarter) return cleanedKnownQuarter.street;
  if (!cleaned) return null;
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned;
}

/* -------------------------------------------------------------------------- */
/* Transformation                                                             */
/* -------------------------------------------------------------------------- */

// Default country for Gabonese listings (platform requires both fields).
const DEFAULT_COUNTRY = "Gabon";
const DEFAULT_COUNTRY_CODE = "GA";
const MAX_TAGS = 6;

/** Everything parsed from the post text/attachments, before defaulting. */
type ParsedFields = {
  title: string | null;
  description: string;
  typeProperty: TypeProperty | null;
  status: StatusProperty | null;
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
  images: Image[];
};

/**
 * Build a platform `Property` (exact model shape) of the detected subtype.
 * Unextracted required fields fall back to defaults; type-specific fields are
 * added only for the matching subtype.
 */
function buildDraft(parsed: ParsedFields, source: ApifyDraftSource): ApifyListingDraft {
  // Optional amenities default to 0; living essentials (rooms, kitchens, baths,
  // toilets, living rooms, floors) default to 1 — a dwelling has at least one.
  const num = (value: number | null) => value ?? 0;
  const count = (value: number | null | undefined) => value ?? 1;

  const base: Omit<ApifyListingDraft, "typeProperty"> = {
    // Location
    street: parsed.street ?? "",
    city: parsed.city ?? "",
    province: parsed.province ?? "",
    longitude: 0,
    latitude: 0,
    country: DEFAULT_COUNTRY,
    countryCode: DEFAULT_COUNTRY_CODE,
    isLocExact: false,
    // ICreation
    state: "IN_PROGRESS",
    // Property
    images: parsed.images,
    title: parsed.title ?? "",
    description: parsed.description,
    area: num(parsed.area),
    price: num(parsed.price),
    tags: parsed.tags.slice(0, MAX_TAGS),
    status: parsed.status ?? (parsed.typeProperty === "Land" ? "FOR_SALE" : "FOR_RENT"),
    contact: parsed.contact ?? "",
    isOwner: false,
    source,
  };

  const logement = {
    nbrRooms: count(parsed.nbrRooms),
    nbrKitchens: count(parsed.nbrKitchens),
    nbrBathrooms: count(parsed.nbrBathrooms),
    nbrToilets: count(parsed.nbrToilets),
  };

  switch (parsed.typeProperty) {
    case "Apartment":
      return { ...base, typeProperty: "Apartment", ...logement, nbrFloorApartment: 1, numeroApartment: "" };
    case "Studio":
      return { ...base, typeProperty: "Studio", ...logement, nbrFloorStudio: 1, numeroStudio: "" };
    case "Villa":
      return {
        ...base,
        typeProperty: "Villa",
        ...logement,
        nbrFloors: 1,
        nbrGarages: 0,
        nbrLivingRoom: count(parsed.nbrLivingRoom),
        nbrPiscine: 0,
      };
    case "Home":
    case "Duplex":
      return {
        ...base,
        typeProperty: parsed.typeProperty,
        ...logement,
        nbrFloors: 1,
        nbrGarages: 0,
        nbrLivingRoom: count(parsed.nbrLivingRoom),
      };
    case "Logement":
      return { ...base, typeProperty: "Logement", ...logement };
    case "Building":
      return { ...base, typeProperty: "Building", nbrApartments: 1, nbrFloors: 1, hasParking: false };
    case "Desk":
      return { ...base, typeProperty: "Desk", nbrToilets: count(parsed.nbrToilets), nbrRooms: count(parsed.nbrRooms) };
    case "Shop":
      return { ...base, typeProperty: "Shop", nbrRooms: count(parsed.nbrRooms), nbrToilet: count(parsed.nbrToilets) };
    case "Warehouse":
      return { ...base, typeProperty: "Warehouse", nbrSections: 1, nbrToilets: count(parsed.nbrToilets) };
    case "Kiosk":
      return { ...base, typeProperty: "Kiosk", kioskType: "" };
    case "Room":
      return { ...base, typeProperty: "Room", roomType: "Chambre américaine" };
    case "Land":
    case "Property":
      return { ...base, typeProperty: parsed.typeProperty };
    default:
      // Undetected kind — left empty and flagged in missingFields.
      return { ...base, typeProperty: "" };
  }
}

/** Transform a single (already-filtered) post into a draft with diagnostics. */
export function transformPost(post: ApifyRawPost): ApifyDraftMeta {
  const original = (post.text ?? "").trim();
  // Parse and display on normalized text so stylized "fancy font" posts are read
  // correctly (e.g. "𝟐𝟎𝟎 𝐦𝐢𝐥𝐥𝐞𝐬" → "200 milles"). rawText keeps the original.
  const text = normalizeText(original).trim();
  const { city, province } = parseCityProvince(text);

  const typeProperty = parseTypeProperty(text);
  const parsed: ParsedFields = {
    title: "",
    description: "",
    typeProperty,
    status: parseStatus(text),
    price: parsePrice(text),
    area: parseArea(text),
    city,
    province,
    street: parseStreet(text),
    contact: parseContact(text),
    nbrRooms: parseCountAfter(text, "chambres?|chbre?s?|ch"),
    nbrLivingRoom: parseCountAfter(text, "salons?"),
    nbrKitchens: parseCountAfter(text, "cuisines?"),
    nbrBathrooms: parseCountAfter(text, "douches?|salles? de bain|salles? d['’ ]eau"),
    nbrToilets: parseCountAfter(text, "toilettes?|wc"),
    tags: parseTags(text, typeProperty),
    images: extractImageUrls(post).map((fileURL) => ({ fileURL, filePATH: "" })),
  };
  const source: ApifyDraftSource = {
    postUrl: extractSourceUrl(post),
    authorUrl: toStr(post.facebookUrl),
    authorName: post.user ? toStr(post.user.name) : null,
    authorId: post.user ? toStr(post.user.id) : null,
    rawText: original,
  };

  // Compose the title + structured description from the typed (defaulted) draft.
  const baseDraft = buildDraft(parsed, source);
  const draft: ApifyListingDraft = { ...baseDraft, ...buildListingContent(baseDraft) };

  // Required platform fields we could not extract (defaulted above).
  const missingFields: string[] = [];
  if (!parsed.typeProperty) missingFields.push("Type de bien");
  if (!parsed.status) missingFields.push("Statut (location/vente)");
  if (parsed.price == null) missingFields.push("Prix");
  if (parsed.area == null) missingFields.push("Superficie");
  if (!parsed.city) missingFields.push("Ville");
  if (!parsed.street) missingFields.push("Quartier");
  if (!parsed.contact) missingFields.push("Contact");
  if (parsed.images.length === 0) missingFields.push("Images");
  // Coordinates are never present in FB text — always require geocoding.
  missingFields.push("Coordonnées GPS");

  const warnings: string[] = [];
  if (parsed.province == null && parsed.city != null) {
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
