import type {
  ListingStatus,
  ListingTypeProperty,
} from "@/modules/account-provisioning/domain/types";
import type {
  ApifyFacebookPost,
  FilterListingsOptions,
  FilterListingsResult,
  ListingClassification,
  ListingFilterKeptPost,
  ListingFilterRejectedPost,
  ListingFilterStats,
  ListingRejectionReason,
} from "@/modules/listing-filter/domain/types";

/**
 * Normalise un texte d'annonce Facebook pour le matching par mots-clés.
 *
 * Les annonceurs gabonais utilisent massivement des « polices » Unicode
 * stylisées (caractères mathématiques bold/sans-serif : 𝗔 𝗟𝗢𝗨𝗘𝗥,
 * 𝐀𝐏𝐏𝐀𝐑𝐓𝐄𝐌𝐄𝐍𝐓). Sans normalisation, aucune regex ASCII ne matche.
 *
 * 1. NFKD : ramène les symboles alphanumériques mathématiques à leur
 *    équivalent ASCII (𝗔 → A) et décompose les accents en diacritiques.
 * 2. Suppression des diacritiques combinants : à → a, é → e.
 * 3. Minuscule + compactage des espaces.
 */
export function normalizeCaption(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // diacritiques combinants (à -> a)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type SignalGroup = {
  label: string;
  pattern: RegExp;
};

// --- Détection du type de bien -------------------------------------------

const APARTMENT_PATTERN = /\b(appartements?|appart|apartements?|apartments?)\b|#appart/;
const STUDIO_PATTERN = /\bstudios?\b|#studio/;
const HOME_PATTERN = /\b(duplex|maisons?)\b|#maison|#duplex/;
const VILLA_PATTERN = /\bvillas?\b|#villa/;
const BUILDING_PATTERN = /\b(immeubles?|buildings?)\b|#immeuble/;
const SHOP_PATTERN = /\b(local commercial|locaux|magasins?|boutiques?|commerces?)\b|#local/;
const DESK_PATTERN = /\b(bureaux?|desk)\b|#bureau/;
const KIOSK_PATTERN = /\b(kiosques?|kiosks?)\b|#kiosque/;
const ROOM_PATTERN = /\b(chambres?)\b|#chambre/;
const LAND_PATTERN = /\b(terrains?|parcelles?|fonciere?s?)\b|#terrain/;
// "F2 / F3 / F4", "2 pièces", "appart de 2 chambres" -> signal logement générique
const FX_PATTERN = /\bf[1-9]\b|\b[1-9]\s?pi[èe]ces?\b|\bnon meubl|\bmeubl[ée]/;

const TYPE_RULES: Array<{ type: ListingTypeProperty; pattern: RegExp }> = [
  { type: "Apartment", pattern: APARTMENT_PATTERN },
  { type: "Villa", pattern: VILLA_PATTERN },
  { type: "Home", pattern: HOME_PATTERN },
  { type: "Studio", pattern: STUDIO_PATTERN },
  { type: "Building", pattern: BUILDING_PATTERN },
  { type: "Desk", pattern: DESK_PATTERN },
  { type: "Shop", pattern: SHOP_PATTERN },
  { type: "Kiosk", pattern: KIOSK_PATTERN },
  { type: "Room", pattern: ROOM_PATTERN },
  { type: "Land", pattern: LAND_PATTERN },
];

function inferTypeProperty(text: string): ListingTypeProperty | null {
  for (const rule of TYPE_RULES) {
    if (rule.pattern.test(text)) {
      return rule.type;
    }
  }
  return null;
}

// --- Signaux transverses --------------------------------------------------

const TRANSACTION_SIGNALS: SignalGroup[] = [
  { label: "a_louer", pattern: /\ba louer\b|\bà louer\b|\blouer\b/ },
  { label: "location", pattern: /\blocation\b/ },
  { label: "loyer", pattern: /\bloyer\b/ },
  { label: "a_vendre", pattern: /\ba vendre\b|\bvente\b|\bvendre\b/ },
  { label: "bail", pattern: /\bbail\b/ },
];

const PRICE_SIGNALS: SignalGroup[] = [
  { label: "fcfa", pattern: /\b(fcfa|cfa|xaf)\b/ },
  { label: "prix", pattern: /\bprix\b/ },
  { label: "par_mois", pattern: /\/\s?mois\b|\bpar mois\b|\bmensuel\b/ },
  { label: "caution", pattern: /\bcaution\b|\bavance\b|\bcommission\b/ },
];

const STRUCTURE_SIGNALS: SignalGroup[] = [
  { label: "chambre", pattern: /\bchambres?\b/ },
  { label: "salon", pattern: /\bsalons?\b|\bs[ée]jours?\b/ },
  { label: "cuisine", pattern: /\bcuisines?\b/ },
  { label: "douche_wc", pattern: /\bdouches?\b|\bwc\b|\bsalles? d'?eau\b|\btoilettes?\b/ },
  { label: "terrasse", pattern: /\bterrasses?\b|\bbalcons?\b|\bv[ée]randa\b/ },
  { label: "parking", pattern: /\bparking\b|\bgarages?\b/ },
  { label: "piscine", pattern: /\bpiscines?\b/ },
  { label: "etage", pattern: /\b[ée]tages?\b|\brdc\b|\brez de chauss[ée]e\b/ },
  { label: "quartier", pattern: /\bquartiers?\b|\bsitu[ée]\b|\bderri[èe]re\b|\bnon loin\b/ },
];

// Sujets clairement hors-logement fréquents dans les groupes scrapés.
const NON_HOUSING_SIGNALS: SignalGroup[] = [
  { label: "canal", pattern: /\bcanal\+?\b|\babonnement\b/ },
  { label: "vehicule", pattern: /\bvoitures?\b|\bv[ée]hicules?\b|\bvend.{0,8}\bauto\b/ },
  { label: "telephone", pattern: /\biphones?\b|\bsamsung\b|\bt[ée]l[ée]phones?\b|\btecno\b/ },
  { label: "emploi", pattern: /\brecrut|\boffre d'?emploi\b|\bcherche (un|une) (vendeu|caissi)/ },
  { label: "transfert", pattern: /\btransfert d'?argent\b|\bmobile money\b/ },
];

function countMatches(text: string, groups: SignalGroup[]): string[] {
  const hits: string[] = [];
  for (const group of groups) {
    if (group.pattern.test(text)) {
      hits.push(group.label);
    }
  }
  return hits;
}

function inferStatus(text: string): ListingStatus | null {
  const rent = /\b(a louer|à louer|location|loyer)\b/.test(text);
  const sale = /\b(a vendre|à vendre|vente)\b/.test(text);
  if (rent && !sale) return "FOR_RENT";
  if (sale && !rent) return "FOR_SALE";
  if (rent) return "FOR_RENT";
  if (sale) return "FOR_SALE";
  return null;
}

/**
 * Classe un post Apify : s'agit-il d'une annonce de logement ?
 *
 * Heuristique : un post est retenu s'il combine un signal « bien immobilier »
 * (type explicite OU structure du logement) avec un signal transactionnel/prix,
 * et n'est pas dominé par un sujet hors-logement.
 */
export function classifyPost(post: ApifyFacebookPost): ListingClassification {
  const rawText = typeof post.text === "string" ? post.text : "";

  if (rawText.trim().length === 0) {
    return {
      isListing: false,
      typeProperty: null,
      status: null,
      score: 0,
      matchedSignals: [],
      rejectionReason: "EMPTY_TEXT",
    };
  }

  const text = normalizeCaption(rawText);

  const typeProperty = inferTypeProperty(text);
  const hasGenericLogement = FX_PATTERN.test(text);

  const transaction = countMatches(text, TRANSACTION_SIGNALS);
  const price = countMatches(text, PRICE_SIGNALS);
  const structure = countMatches(text, STRUCTURE_SIGNALS);
  const nonHousing = countMatches(text, NON_HOUSING_SIGNALS);

  const matchedSignals = [
    ...(typeProperty ? [`type:${typeProperty}`] : []),
    ...(hasGenericLogement ? ["type:logement"] : []),
    ...transaction.map((s) => `tx:${s}`),
    ...price.map((s) => `price:${s}`),
    ...structure.map((s) => `struct:${s}`),
    ...nonHousing.map((s) => `neg:${s}`),
  ];

  const hasPropertyKind = typeProperty !== null || hasGenericLogement;
  const hasTransactionOrPrice = transaction.length > 0 || price.length > 0;
  const structureCount = structure.length;

  // Règles d'acceptation :
  //  A. Type de bien explicite + (transaction/prix OU structure)
  //  B. Pas de type explicite mais forte description (>=2 éléments de
  //     structure) ET un signal transactionnel/prix -> logement générique.
  const ruleA = hasPropertyKind && (hasTransactionOrPrice || structureCount >= 1);
  const ruleB = !hasPropertyKind && structureCount >= 2 && hasTransactionOrPrice;

  let isListing = ruleA || ruleB;

  // Un sujet hors-logement dominant (ex: canal+, voiture) sans type de bien
  // explicite fait basculer en rejet, même si quelques mots coïncident.
  if (isListing && nonHousing.length > 0 && typeProperty === null) {
    isListing = false;
  }

  if (!isListing) {
    const rejectionReason: ListingRejectionReason =
      nonHousing.length > 0 ? "NON_HOUSING_TOPIC" : "NO_PROPERTY_SIGNAL";
    return {
      isListing: false,
      typeProperty: null,
      status: null,
      score: scoreOf({ typeProperty, hasGenericLogement, transaction, price, structure }),
      matchedSignals,
      rejectionReason,
    };
  }

  const resolvedType: ListingTypeProperty =
    typeProperty ?? (hasGenericLogement ? "Logement" : "Logement");

  return {
    isListing: true,
    typeProperty: resolvedType,
    status: inferStatus(text),
    score: scoreOf({ typeProperty, hasGenericLogement, transaction, price, structure }),
    matchedSignals,
    rejectionReason: null,
  };
}

function scoreOf(input: {
  typeProperty: ListingTypeProperty | null;
  hasGenericLogement: boolean;
  transaction: string[];
  price: string[];
  structure: string[];
}): number {
  let score = 0;
  if (input.typeProperty) score += 0.4;
  else if (input.hasGenericLogement) score += 0.2;
  if (input.transaction.length > 0) score += 0.25;
  if (input.price.length > 0) score += 0.2;
  score += Math.min(input.structure.length, 4) * 0.05;
  return Math.min(Math.round(score * 100) / 100, 1);
}

const TEXT_PREVIEW_LENGTH = 120;

function textPreview(post: ApifyFacebookPost): string {
  const raw = typeof post.text === "string" ? post.text : "";
  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length > TEXT_PREVIEW_LENGTH
    ? `${flat.slice(0, TEXT_PREVIEW_LENGTH)}…`
    : flat;
}

/**
 * Filtre un tableau de posts Apify pour ne conserver que les annonces de
 * logement, et retourne un rapport détaillé (stats + rejets).
 */
export function filterListings(
  posts: ApifyFacebookPost[],
  options: FilterListingsOptions = {},
): FilterListingsResult {
  const kept: ListingFilterKeptPost[] = [];
  const rejected: ListingFilterRejectedPost[] = [];
  const listings: ApifyFacebookPost[] = [];

  const byType: ListingFilterStats["byType"] = {};
  const byRejectionReason: ListingFilterStats["byRejectionReason"] = {};

  posts.forEach((post, index) => {
    const classification = classifyPost(post);

    if (classification.isListing) {
      kept.push({ index, post, classification });

      const outputPost = options.annotate
        ? { ...post, _classification: classification }
        : post;
      listings.push(outputPost);

      if (classification.typeProperty) {
        byType[classification.typeProperty] =
          (byType[classification.typeProperty] ?? 0) + 1;
      }
    } else {
      const reason = classification.rejectionReason ?? "NO_PROPERTY_SIGNAL";
      rejected.push({
        index,
        reason,
        userName:
          typeof post.user?.name === "string" ? post.user.name.trim() : null,
        textPreview: textPreview(post),
      });
      byRejectionReason[reason] = (byRejectionReason[reason] ?? 0) + 1;
    }
  });

  return {
    listings,
    kept,
    rejected,
    stats: {
      total: posts.length,
      kept: kept.length,
      rejected: rejected.length,
      byType,
      byRejectionReason,
    },
  };
}
