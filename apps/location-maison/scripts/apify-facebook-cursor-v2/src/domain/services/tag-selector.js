const MAX_TAGS = 6;
const path = require('path');

function loadSharedAllowedTags() {
  try {
    const sharedPath = path.resolve(__dirname, '../../../../../src/constantes/tags.json');
    const fromJson = require(sharedPath);
    if (Array.isArray(fromJson) && fromJson.length > 0) {
      return fromJson.map((tag) => String(tag || '').trim()).filter(Boolean);
    }
  } catch (_error) {
    // fallback local si le JSON partagé n'est pas trouvable
  }
  return ['Agence', 'Propriétaire', 'Parking', 'Balcon', 'Terrasse', 'Meublé', 'Sécurisé'];
}

const ALLOWED_TAGS = loadSharedAllowedTags();

function normalizeTagKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const TAG_INDEX = new Map(ALLOWED_TAGS.map((tag) => [normalizeTagKey(tag), tag]));

const TAG_ALIASES = {
  meuble: 'Meublé',
  meublee: 'Meublé',
  securise: 'Sécurisé',
  securisee: 'Sécurisé',
  centreville: 'Centre-ville',
  'centre ville': 'Centre-ville',
  wifi: 'Wi-Fi',
  internet: 'Wi-Fi',
  proprietaire: 'Propriétaire',
  agence: 'Agence',
  commerce: 'Commerces proches',
  transport: 'Transport proche',
  plage: 'Proche de la plage',
  etudiant: 'Étudiant',
};

const INFERENCE_RULES = [
  { tag: 'Parking', pattern: /\bparking\b/i },
  { tag: 'Garage', pattern: /\bgarage\b/i },
  { tag: 'Balcon', pattern: /\bbalcon\b/i },
  { tag: 'Terrasse', pattern: /\bterrasse\b/i },
  { tag: 'Meublé', pattern: /\bmeubl[ée]?\b/i },
  { tag: 'Sous barrière', pattern: /\b(sous\s+barri[eè]re|dans\s+la\s+barri[eè]re|barri[eè]re)\b/i },
  { tag: 'Sécurisé', pattern: /\b(s[eé]curis|gardi(en|ens)|vid[eé]osurveillance|alarme)\b/i },
  { tag: 'Wi-Fi', pattern: /\b(wi[\s-]?fi|internet)\b/i },
  { tag: 'Piscine', pattern: /\bpiscine\b/i },
  { tag: 'Commerces proches', pattern: /\b(commerce|supermarch[eé]|march[eé]|boutique)\b/i },
  { tag: 'Transport proche', pattern: /\b(transport|bus|taxi|arr[eê]t)\b/i },
  { tag: 'Centre-ville', pattern: /\bcentre[\s-]?ville\b/i },
  { tag: 'Famille', pattern: /\bfamill(e|ial)\b/i },
  { tag: 'Couple', pattern: /\bcouple\b/i },
  { tag: 'Étudiant', pattern: /\b([eé]tudiant|universit[eé]|campus)\b/i },
  { tag: 'Adapté aux enfants', pattern: /\b(enfant|cr[eè]che|[eé]cole)\b/i },
  { tag: 'Accessible handicapés', pattern: /\b(handicap|pmr|accessible)\b/i },
  { tag: 'Calme et tranquillité', pattern: /\b(calme|tranquillit[eé])\b/i },
  { tag: 'Animaux admis', pattern: /\b(animaux?|chien|chat)\b/i },
  { tag: 'Court séjour', pattern: /\b(court\s+s[eé]jour|nuit[ée]e|journalier|airbnb)\b/i },
  { tag: 'Proche de la plage', pattern: /\b(plage|bord\s+de\s+mer)\b/i },
  { tag: 'Nature', pattern: /\b(nature|verdure|espace\s+vert|jardin)\b/i },
  { tag: 'Activités sportives', pattern: /\b(sport|stade|gym|salle\s+de\s+sport)\b/i },
  { tag: 'Vélo', pattern: /\bv[eé]lo\b/i },
  { tag: 'Duplex', pattern: /\bduplex\b/i },
  { tag: 'Boutique', pattern: /\b(boutique|local\s+commercial|magasin)\b/i },
  { tag: 'Villa', pattern: /\bvilla\b/i },
  { tag: 'Travail', pattern: /\b(bureau|professionnel|travail|office)\b/i },
  { tag: 'Vacances', pattern: /\b(vacances?|holiday)\b/i },
  { tag: 'Collocation', pattern: /\b(colocation|coloc)\b/i },
  { tag: 'Montagne', pattern: /\bmontagne\b/i },
];

function canonicalizeTag(value) {
  const key = normalizeTagKey(value);
  if (!key) return '';
  if (TAG_INDEX.has(key)) return TAG_INDEX.get(key);
  if (TAG_ALIASES[key]) return TAG_ALIASES[key];
  return '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

class TagSelector {
  select(propertyLike, options = {}) {
    const sellerType = String(options.sellerType || 'agency').toLowerCase();
    const mandatorySellerTag = sellerType === 'agency' ? 'Agence' : 'Propriétaire';

    const fromModel = Array.isArray(propertyLike?.tags)
      ? propertyLike.tags.map(canonicalizeTag).filter(Boolean)
      : [];

    const textCorpus = [
      propertyLike?.rawText || '',
      propertyLike?.title || '',
      propertyLike?.description || '',
    ].join('\n');

    const inferred = INFERENCE_RULES
      .filter((rule) => rule.pattern.test(textCorpus))
      .map((rule) => rule.tag);

    const fromType = [];
    const typeProperty = String(propertyLike?.typeProperty || '');
    if (typeProperty === 'Villa') fromType.push('Villa');
    if (typeProperty === 'Shop') fromType.push('Boutique');

    const merged = unique([
      mandatorySellerTag,
      ...fromModel,
      ...fromType,
      ...inferred,
    ]).slice(0, MAX_TAGS);

    if (!merged.includes(mandatorySellerTag)) {
      return [mandatorySellerTag, ...merged].slice(0, MAX_TAGS);
    }

    return merged;
  }
}

module.exports = { TagSelector, ALLOWED_TAGS };
