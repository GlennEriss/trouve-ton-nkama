const ALLOWED_TYPES = new Set([
  'Home',
  'Studio',
  'Apartment',
  'Desk',
  'Building',
  'Shop',
  'Kiosk',
  'Room',
  'Villa',
  'Land',
]);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseOptionalInt(value) {
  const numeric = parseOptionalNumber(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric);
  return rounded >= 0 ? rounded : null;
}

function toNonNegativeInt(value, fallback = 0) {
  const parsed = parseOptionalInt(value);
  return parsed !== null ? parsed : fallback;
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = parseOptionalNumber(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed >= 0 ? parsed : fallback;
}

function extractIntFromPatterns(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const candidate = parseInt(match[1], 10);
    if (Number.isFinite(candidate) && candidate >= 0) {
      return candidate;
    }
  }
  return null;
}

function inferRooms(item, text) {
  const explicit = parseOptionalInt(item.nbrRooms);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [
    /(\d{1,2})\s*(?:chambres?|chbre?s?|ch\b)/i,
    /(\d{1,2})\s*(?:pieces?|pi[eè]ces?)/i,
  ]);
  if (parsed !== null) return parsed;
  if (/\bstudio\b/i.test(text) || /\bchambre\b/i.test(text)) return 1;
  return 0;
}

function inferBathrooms(item, text) {
  const explicit = parseOptionalInt(item.nbrBathrooms);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [
    /(\d{1,2})\s*(?:salles?\s*d['’]?\s*(?:eau|bain)|douches?|sdb|bathrooms?)/i,
  ]);
  if (parsed !== null) return parsed;
  return /\bdouche|salle d['’]eau|sdb|bathroom\b/i.test(text) ? 1 : 0;
}

function inferToilets(item, text, bathrooms) {
  const explicit = parseOptionalInt(item.nbrToilets);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [/(\d{1,2})\s*(?:toilettes?|wc)\b/i]);
  if (parsed !== null) return parsed;
  if (/\bwc|toilettes?\b/i.test(text)) return 1;
  return bathrooms > 0 ? bathrooms : 0;
}

function inferKitchens(item, text) {
  const explicit = parseOptionalInt(item.nbrChickens);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [/(\d{1,2})\s*(?:cuisines?|kitchens?)\b/i]);
  if (parsed !== null) return parsed;
  return /\bcuisine|kitchen\b/i.test(text) ? 1 : 0;
}

function inferLivingRooms(item, text) {
  const explicit = parseOptionalInt(item.nbrLivingRoom);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [/(\d{1,2})\s*(?:salons?|sejours?|séjours?|living)\b/i]);
  if (parsed !== null) return parsed;
  return /\bsalon|sejour|séjour|living\b/i.test(text) ? 1 : 0;
}

function inferFloorLevel(text) {
  if (/\b(?:rez[- ]de[- ]chaussee|rdc)\b/i.test(text)) return 0;
  const parsed = extractIntFromPatterns(text, [
    /(\d{1,2})\s*(?:er|e|eme|eme)?\s*(?:etage|étage|floor|niveau)\b/i,
    /(?:etage|étage|floor|niveau)\s*[:#-]?\s*(\d{1,2})\b/i,
  ]);
  return parsed !== null ? parsed : 0;
}

function inferFloorsTotal(item, text) {
  const explicit = parseOptionalInt(item.nbrFloors);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [
    /(\d{1,2})\s*(?:etages?|étages?|niveaux?|floors?)\b/i,
    /(?:etages?|étages?|niveaux?|floors?)\s*[:#-]?\s*(\d{1,2})\b/i,
  ]);
  if (parsed !== null) return parsed;
  if (/\btriplex\b/i.test(text)) return 3;
  if (/\bduplex\b/i.test(text)) return 2;
  return 1;
}

function inferGarages(item, text) {
  const explicit = parseOptionalInt(item.nbrGarages);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [/(\d{1,2})\s*(?:garages?|parkings?)\b/i]);
  if (parsed !== null) return parsed;
  return /\bgarage|parking\b/i.test(text) ? 1 : 0;
}

function inferPools(item, text) {
  const explicit = parseOptionalInt(item.nbrPiscine);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [/(\d{1,2})\s*(?:piscines?|pools?)\b/i]);
  if (parsed !== null) return parsed;
  return /\bpiscine|pool\b/i.test(text) ? 1 : 0;
}

function inferBuildingApartments(item, text) {
  const explicit = parseOptionalInt(item.nbrApartments);
  if (explicit !== null) return explicit;
  const parsed = extractIntFromPatterns(text, [/(\d{1,3})\s*(?:appartements?|logements?|studios?)\b/i]);
  return parsed !== null ? parsed : 0;
}

function inferHasParking(item, text) {
  if (typeof item.hasParking === 'boolean') return item.hasParking;
  return /\bparking|garage\b/i.test(text);
}

function inferUnitNumber(existingValue, text, kind, index) {
  const isValidCandidate = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) return false;
    const normalized = normalizeText(value);
    const blocked = new Set([
      'moderne',
      'nouveau',
      'nouvelle',
      'charmant',
      'charmante',
      'standing',
      'securise',
      'securisee',
      'louer',
      'vendre',
    ]);
    if (blocked.has(normalized)) return false;
    if (value.length > 10) return false;
    if (/\d/.test(value)) return true;
    return /^[a-z]{1,2}$/i.test(value);
  };

  const explicit = String(existingValue || '').trim();
  if (isValidCandidate(explicit)) return explicit;

  const patterns =
    kind === 'studio'
      ? [
          /(?:studio|n[°o]|numero)\s*[:#-]?\s*([a-z0-9-]{1,12})\b/i,
          /\b([a-z]\d{1,4})\b/i,
        ]
      : [
          /(?:appartement|apt|app|n[°o]|numero)\s*[:#-]?\s*([a-z0-9-]{1,12})\b/i,
          /\b([a-z]\d{1,4})\b/i,
        ];

  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match?.[1] && isValidCandidate(match[1])) return String(match[1]).toUpperCase();
  }

  const prefix = kind === 'studio' ? 'ST' : 'APT';
  return `${prefix}-${String(index + 1).padStart(2, '0')}`;
}

function inferRoomType(item, text) {
  const explicit = String(item.roomType || '').trim();
  if (explicit) return explicit;
  const normalized = normalizeText(text);
  if (/\bamericaine|américaine\b/.test(normalized)) return 'Américaine';
  if (/\bindividuelle?\b/.test(normalized)) return 'Individuelle';
  if (/\bdouble\b/.test(normalized)) return 'Double';
  if (/\bpartagee?|partagée?|colocation\b/.test(normalized)) return 'Partagée';
  if (/\bsimple\b/.test(normalized)) return 'Simple';
  return 'Standard';
}

function inferKioskType(item, text) {
  const explicit = String(item.kioskType || '').trim();
  if (explicit) return explicit;
  const normalized = normalizeText(text);
  if (/\bpharmacie\b/.test(normalized)) return 'Pharmacie';
  if (/\balimentaire|nourriture\b/.test(normalized)) return 'Alimentaire';
  if (/\bbureau|administratif\b/.test(normalized)) return 'Bureau';
  return 'Standard';
}

function normalizeTypeProperty(value) {
  const type = String(value || '').trim();
  if (ALLOWED_TYPES.has(type)) return type;
  return 'Home';
}

function buildTypeSpecificFields(item, sourceText, index) {
  const typeProperty = normalizeTypeProperty(item.typeProperty);
  const rooms = inferRooms(item, sourceText);
  const bathrooms = inferBathrooms(item, sourceText);
  const toilets = inferToilets(item, sourceText, bathrooms);
  const kitchens = inferKitchens(item, sourceText);
  const livingRooms = inferLivingRooms(item, sourceText);

  const logementFields = {
    nbrRooms: rooms,
    nbrChickens: kitchens,
    nbrBathrooms: bathrooms,
    nbrToilets: toilets,
  };

  switch (typeProperty) {
    case 'Apartment':
      return {
        ...logementFields,
        nbrFloorApartment: toNonNegativeInt(item.nbrFloorApartment, inferFloorLevel(sourceText)),
        numeroApartment: inferUnitNumber(item.numeroApartment, sourceText, 'apartment', index),
      };
    case 'Studio':
      return {
        ...logementFields,
        nbrFloorStudio: toNonNegativeInt(item.nbrFloorStudio, inferFloorLevel(sourceText)),
        numeroStudio: inferUnitNumber(item.numeroStudio, sourceText, 'studio', index),
      };
    case 'Home':
      return {
        ...logementFields,
        nbrFloors: toNonNegativeInt(item.nbrFloors, inferFloorsTotal(item, sourceText)),
        nbrGarages: toNonNegativeInt(item.nbrGarages, inferGarages(item, sourceText)),
        nbrLivingRoom: toNonNegativeInt(item.nbrLivingRoom, livingRooms),
      };
    case 'Villa':
      return {
        ...logementFields,
        nbrFloors: toNonNegativeInt(item.nbrFloors, inferFloorsTotal(item, sourceText)),
        nbrGarages: toNonNegativeInt(item.nbrGarages, inferGarages(item, sourceText)),
        nbrLivingRoom: toNonNegativeInt(item.nbrLivingRoom, livingRooms),
        nbrPiscine: toNonNegativeInt(item.nbrPiscine, inferPools(item, sourceText)),
      };
    case 'Building':
      return {
        nbrApartments: toNonNegativeInt(item.nbrApartments, inferBuildingApartments(item, sourceText)),
        nbrFloors: toNonNegativeInt(item.nbrFloors, inferFloorsTotal(item, sourceText)),
        hasParking: inferHasParking(item, sourceText),
      };
    case 'Desk':
      return {
        nbrRooms: rooms,
        nbrToilets: toilets,
      };
    case 'Shop':
      return {
        nbrRooms: rooms,
        nbrToilet: toNonNegativeInt(item.nbrToilet, toilets),
      };
    case 'Kiosk':
      return {
        kioskType: inferKioskType(item, sourceText),
      };
    case 'Room':
      return {
        roomType: inferRoomType(item, sourceText),
      };
    default:
      return {};
  }
}

module.exports = {
  name: '05-map-property',
  async execute(context) {
    const sellerType = context.agency?.key ? 'agency' : 'owner';
    const selectTags =
      typeof context.services?.tagSelector?.select === 'function'
        ? context.services.tagSelector.select.bind(context.services.tagSelector)
        : () => (sellerType === 'agency' ? ['Agence'] : ['Propriétaire']);

    const mapped = (context.artifacts.enrichedPosts || []).map((item, index) => {
      const typeProperty = normalizeTypeProperty(item.typeProperty);
      const cityDefault = String(context.agency?.defaults?.cityDefault || '').trim();
      const provinceDefault = String(context.agency?.defaults?.provinceDefault || '').trim();
      const district =
        String(item.location?.district || '').trim() ||
        String(item.location?.city || '').trim() ||
        cityDefault;
      const city = String(item.location?.city || '').trim() || cityDefault;
      const province = String(item.location?.province || '').trim() || provinceDefault;
      const sourceText = [item.rawText, item.title, item.description].filter(Boolean).join(' ');
      const rawTags = selectTags(item, { sellerType });
      const normalizedTags = [...new Set((rawTags || []).filter(Boolean).map((tag) => String(tag).trim()))]
        .slice(0, 6);
      const tags = normalizedTags.length
        ? normalizedTags
        : sellerType === 'agency'
          ? ['Agence']
          : ['Propriétaire'];

      return {
        id: `${context.agency.key}-${context.job.id}-${index + 1}`,
        title: item.title,
        description: item.description,
        typeProperty,
        price: toNonNegativeInt(item.price, 0),
        area: toNonNegativeNumber(item.area, 0),
        status: item.status || context.agency.defaults.statusDefault || 'FOR_RENT',
        tags,
        images: (item.imageUrls || []).map((url) => ({ fileURL: url })),
        contact: item.contact || '',
        address: {
          district,
          city,
          province,
        },
        street: district,
        city,
        province,
        longitude: Number(item.location?.lon ?? item.location?.longitude ?? 0) || 0,
        latitude: Number(item.location?.lat ?? item.location?.latitude ?? 0) || 0,
        country: context.agency.defaults.country,
        countryCode: context.agency.defaults.countryCode,
        isLocExact: false,
        createdBy: context.agency.uid,
        sourceMeta: {
          sourceId: item.sourceId,
          fingerprint: item.fingerprint,
          agencyKey: context.agency.key,
          jobId: context.job.id,
        },
        ...buildTypeSpecificFields(item, sourceText, index),
      };
    });

    context.artifacts.mappedProperties = mapped;
    context.metrics.totalMapped = mapped.length;
    context.logger.info('Properties mapped', { totalMapped: mapped.length });
  },
};
