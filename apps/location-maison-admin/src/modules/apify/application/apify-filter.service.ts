import type { ApifyRawPost } from "../domain/types";

// Unambiguous residential property kinds — qualify a post on their own.
const PROPERTY_KIND_KEYWORDS = [
  "appartement",
  "appart",
  "studio",
  "villa",
  "maison",
  "duplex",
  "chambre",
  "terrain",
  "parcelle",
  "immeuble",
  "logement",
];

// Commercial kinds that ALSO appear in non-real-estate posts ("nous avons une
// boutique physique", "vente de gâteaux en magasin"). They qualify only when a
// rent/sale signal is also present (see RENT_SALE_KEYWORDS).
const COMMERCIAL_KIND_KEYWORDS = ["magasin", "boutique", "local commercial", "entrepôt", "entrepot"];

// A rental/sale intent specific to real estate. Lowercased substrings.
// Note: "vente"/"vendre" alone are deliberately excluded (too generic for
// commerce posts) — sale listings are caught via the property kind instead.
const INTENT_KEYWORDS = [
  "à louer",
  "a louer",
  "location",
  "colocation",
  "loyer",
  "immobil", // immobilier / immobilière / immobiliere
];

// Rent/sale signals that confirm a commercial-kind post is really real estate.
const RENT_SALE_KEYWORDS = [
  "à louer",
  "a louer",
  "loyer",
  "location",
  "à vendre",
  "a vendre",
  "en vente",
  "bail",
  "caution",
];

/**
 * Normalize stylized Unicode (mathematical bold/italic "fancy fonts" commonly
 * used in Facebook posts) to plain ASCII via NFKC, so keyword matching and
 * parsing work on posts like "𝗔 𝗟𝗢𝗨𝗘𝗥 #𝗔𝗣𝗣𝗔𝗥𝗧𝗘𝗠𝗘𝗡𝗧". Emojis are preserved.
 */
export function normalizeText(raw: string): string {
  return raw.normalize("NFKC");
}

export function hasText(post: ApifyRawPost): boolean {
  return Boolean((post.text ?? "").trim());
}

/**
 * A post is a real-estate listing when it has text AND names a property kind
 * (appartement, villa, terrain…) OR carries a real-estate rental/sale intent
 * (à louer, loyer, immobilier…). Currency, "caution", room words etc. are NOT
 * sufficient on their own — that is what previously let promotional posts
 * (e.g. "tee shirt … 7000 FCFA") slip through.
 */
export function isRealEstatePost(post: ApifyRawPost): boolean {
  if (!hasText(post)) {
    return false;
  }
  const text = normalizeText(post.text ?? "").toLowerCase();
  if (PROPERTY_KIND_KEYWORDS.some((keyword) => text.includes(keyword))) return true;
  if (INTENT_KEYWORDS.some((keyword) => text.includes(keyword))) return true;
  // Commercial kinds only count alongside a rent/sale signal.
  const hasCommercialKind = COMMERCIAL_KIND_KEYWORDS.some((keyword) => text.includes(keyword));
  const hasRentSale = RENT_SALE_KEYWORDS.some((keyword) => text.includes(keyword));
  return hasCommercialKind && hasRentSale;
}
