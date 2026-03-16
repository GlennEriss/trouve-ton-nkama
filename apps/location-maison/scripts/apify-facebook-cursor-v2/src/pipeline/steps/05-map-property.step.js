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
  return String(value || '').trim();
}

function normalizeTextFold(value) {
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

function toNonNegativeInt(value, defaultValue = 0) {
  const parsed = parseOptionalInt(value);
  return parsed !== null ? parsed : defaultValue;
}

function toNonNegativeNumber(value, defaultValue = 0) {
  const parsed = parseOptionalNumber(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return parsed >= 0 ? parsed : defaultValue;
}

function normalizeTypeProperty(value) {
  const type = String(value || '').trim();
  return ALLOWED_TYPES.has(type) ? type : 'Home';
}

function normalizeLocation(locationLike) {
  const location = locationLike && typeof locationLike === 'object' ? locationLike : {};
  return {
    district: normalizeText(location.district),
    city: normalizeText(location.city),
    province: normalizeText(location.province),
    lon: Number(location.lon ?? location.longitude ?? 0) || 0,
    lat: Number(location.lat ?? location.latitude ?? 0) || 0,
  };
}

function countMatches(text, regex) {
  const matches = String(text || '').match(regex);
  return matches ? matches.length : 0;
}

function detectTypeFromText(text) {
  const normalized = normalizeTextFold(text);
  if (!normalized) return '';

  const scores = {
    Apartment: countMatches(normalized, /\b(appartement|appart|apt)\b/g) * 4,
    Studio: countMatches(normalized, /\bstudio\b/g) * 4,
    Villa: countMatches(normalized, /\bvilla\b/g) * 4 + countMatches(normalized, /\bduplex\b/g) * 2,
    Land: countMatches(normalized, /\b(terrain|parcelle|hectare)\b/g) * 4,
    Building: countMatches(normalized, /\bimmeuble\b/g) * 4,
    Desk: countMatches(normalized, /\bbureau[x]?\b/g) * 4,
    Shop: countMatches(normalized, /\b(boutique|local commercial|magasin)\b/g) * 4,
    Kiosk: countMatches(normalized, /\bkiosque\b/g) * 4,
    Room: countMatches(normalized, /\bchambre\b/g) * 2,
    Home: countMatches(normalized, /\bmaison\b/g) * 4,
  };

  let bestType = '';
  let bestScore = 0;
  Object.entries(scores).forEach(([type, score]) => {
    if (score > bestScore) {
      bestType = type;
      bestScore = score;
    }
  });

  if (!bestType || bestScore <= 0) return '';
  return bestType;
}

function resolveTypeProperty(item, sourceText) {
  const aiType = normalizeTypeProperty(item.typeProperty);
  const detected = detectTypeFromText(sourceText);
  if (!detected) return aiType;
  if (detected === aiType) return aiType;

  if (detected === 'Land') return 'Land';
  if (aiType === 'Home' || aiType === 'Room') return detected;
  if (aiType === 'Studio' && detected === 'Apartment') return 'Apartment';
  if (aiType === 'Apartment' && detected === 'Studio') return 'Apartment';

  return aiType;
}

function detectStatusFromText(text) {
  const normalized = normalizeTextFold(text);
  if (!normalized) return '';
  if (/\b(vente|en vente|a vendre|vendre|vendu|vendue|cession)\b/.test(normalized)) return 'FOR_SALE';
  if (/\b(loyer|location|a louer|louer|bail)\b/.test(normalized)) return 'FOR_RENT';
  return '';
}

function resolveStatus(item, typeProperty, sourceText) {
  const raw = String(item.status || '').trim().toUpperCase();
  const aiStatus = raw === 'FOR_RENT' || raw === 'FOR_SALE' ? raw : '';
  const fromText = detectStatusFromText(sourceText);
  let status = aiStatus || fromText || 'FOR_RENT';

  const normalized = normalizeTextFold(sourceText);
  const hasRentSignal = /\b(loyer|location|a louer|louer|bail)\b/.test(normalized);
  if (typeProperty === 'Land' && status === 'FOR_RENT' && !hasRentSignal) {
    status = 'FOR_SALE';
  }

  return status;
}

function isLikelyPhoneNumber(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return false;
  return /^(?:241)?0?[67]\d{6,7}$/.test(digits) || /^[67]\d{6,7}$/.test(digits);
}

function parsePriceCandidate(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 0;

  const scaled = raw.match(/^(\d+(?:[.,]\d+)?)\s*(mille|mil|k|m|million|millions)$/);
  if (scaled) {
    const base = Number(scaled[1].replace(',', '.'));
    if (!Number.isFinite(base) || base <= 0) return 0;
    const unit = scaled[2];
    if (unit === 'mille' || unit === 'mil' || unit === 'k' || unit === 'm') {
      return Math.round(base * 1000);
    }
    return Math.round(base * 1_000_000);
  }

  const grouped = raw.match(/\d{1,3}(?:[\s.]\d{3})+/);
  if (grouped) {
    const digits = grouped[0].replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }

  const digitsOnly = raw.replace(/[^\d]/g, '');
  return digitsOnly ? Number(digitsOnly) : 0;
}

function extractPriceFromText(text) {
  const raw = String(text || '');
  if (!raw.trim()) return 0;

  const normalized = normalizeTextFold(raw);
  const withoutPhones = normalized
    .replace(/(?:\+?241[\s.-]?)?(?:0?[67]\d{6,7}|0?[67](?:[\s.-]\d{2}){3,4})\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const contextualPatterns = [
    /\b(?:prix|loyer|montant|tarif|cout|coût)\b\s*[:\-]?\s*((?:\d{1,3}(?:[\s.]\d{3})+)|(?:\d+(?:[.,]\d+)?\s*(?:mille|mil|k|m|million|millions)?)|(?:\d{5,10}))/g,
    /\b([0-9][0-9\s.,]{2,15}(?:\s*(?:mille|mil|k|m|million|millions))?)\s*(?:f(?:\s*cfa)?|fcfa|xaf|cfa)\b/g,
  ];

  for (const pattern of contextualPatterns) {
    let match;
    while ((match = pattern.exec(withoutPhones)) !== null) {
      const parsed = parsePriceCandidate(match[1]);
      if (parsed >= 10_000 && parsed <= 2_000_000_000) {
        return parsed;
      }
    }
  }

  const directMatches = withoutPhones.match(/\b(\d{5,10})\b/g) || [];
  for (const candidate of directMatches) {
    if (isLikelyPhoneNumber(candidate)) continue;
    const parsed = parsePriceCandidate(candidate);
    if (parsed >= 10_000 && parsed <= 2_000_000_000) return parsed;
  }

  return 0;
}

function resolvePrice(item, sourceText) {
  const aiPrice = toNonNegativeInt(item.price, 0);
  const textPrice = extractPriceFromText(sourceText);

  if (aiPrice >= 10_000) return aiPrice;
  if (textPrice > 0) return textPrice;
  return aiPrice;
}

function extractCountFromText(text, patterns) {
  const source = String(text || '');
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.round(parsed);
  }
  return 0;
}

function resolveHousingCounts(item, sourceText) {
  const rooms = toNonNegativeInt(item.nbrRooms, 0) || extractCountFromText(sourceText, [
    /(\d{1,2})\s*(?:chambres?|ch\b)/i,
  ]);
  const kitchens =
    toNonNegativeInt(item.nbrKitchens ?? item.nbrChickens, 0) ||
    extractCountFromText(sourceText, [/(\d{1,2})\s*cuisines?\b/i]) ||
    (/\bcuisine\b/i.test(sourceText) ? 1 : 0);
  const bathrooms =
    toNonNegativeInt(item.nbrBathrooms, 0) ||
    extractCountFromText(sourceText, [/(\d{1,2})\s*(?:salles?\s*d['’]?\s*(?:eau|bain)|douches?|sdb)\b/i]) ||
    (/\b(douche|salle d['’]?eau|sdb)\b/i.test(sourceText) ? 1 : 0);
  const toilets =
    toNonNegativeInt(item.nbrToilets, 0) ||
    extractCountFromText(sourceText, [/(\d{1,2})\s*(?:toilettes?|wc)\b/i]) ||
    (/\b(wc|toilette)\b/i.test(sourceText) ? 1 : 0);
  const livingRooms =
    toNonNegativeInt(item.nbrLivingRoom, 0) ||
    extractCountFromText(sourceText, [/(\d{1,2})\s*(?:salons?|sejours?|séjours?)\b/i]) ||
    (/\b(salon|sejour|séjour)\b/i.test(sourceText) ? 1 : 0);

  return {
    rooms,
    kitchens,
    bathrooms,
    toilets,
    livingRooms,
  };
}

function applyTypeMinimums(typeProperty, counts) {
  const next = { ...counts };

  if (['Apartment', 'Home', 'Villa'].includes(typeProperty)) {
    next.rooms = Math.max(next.rooms, 1);
    next.kitchens = Math.max(next.kitchens, 1);
    next.bathrooms = Math.max(next.bathrooms, 1);
    next.toilets = Math.max(next.toilets, 1);
    next.livingRooms = Math.max(next.livingRooms, 1);
  }

  if (typeProperty === 'Studio') {
    next.rooms = Math.max(next.rooms, 1);
    next.kitchens = Math.max(next.kitchens, 1);
    next.bathrooms = Math.max(next.bathrooms, 1);
    next.toilets = Math.max(next.toilets, 1);
  }

  return next;
}

function buildTypeSpecificFields(item, typeProperty, sourceText) {
  const normalizedCounts = applyTypeMinimums(
    typeProperty,
    resolveHousingCounts(item, sourceText)
  );

  const sharedHousingFields = {
    nbrRooms: normalizedCounts.rooms,
    nbrKitchens: normalizedCounts.kitchens,
    nbrBathrooms: normalizedCounts.bathrooms,
    nbrToilets: normalizedCounts.toilets,
  };

  switch (typeProperty) {
    case 'Apartment':
      return {
        ...sharedHousingFields,
        nbrFloorApartment: toNonNegativeInt(item.nbrFloorApartment, 0),
        numeroApartment: normalizeText(item.numeroApartment),
        nbrLivingRoom: normalizedCounts.livingRooms,
      };
    case 'Studio':
      return {
        ...sharedHousingFields,
        nbrFloorStudio: toNonNegativeInt(item.nbrFloorStudio, 0),
        numeroStudio: normalizeText(item.numeroStudio),
      };
    case 'Home':
      return {
        ...sharedHousingFields,
        nbrFloors: toNonNegativeInt(item.nbrFloors, 0),
        nbrGarages: toNonNegativeInt(item.nbrGarages, 0),
        nbrLivingRoom: normalizedCounts.livingRooms,
      };
    case 'Villa':
      return {
        ...sharedHousingFields,
        nbrFloors: toNonNegativeInt(item.nbrFloors, 0),
        nbrGarages: toNonNegativeInt(item.nbrGarages, 0),
        nbrLivingRoom: normalizedCounts.livingRooms,
        nbrPiscine: toNonNegativeInt(item.nbrPiscine, 0),
      };
    case 'Building':
      return {
        nbrApartments: toNonNegativeInt(item.nbrApartments, 0),
        nbrFloors: toNonNegativeInt(item.nbrFloors, 0),
        hasParking: Boolean(item.hasParking),
      };
    case 'Desk':
      return {
        nbrRooms: normalizedCounts.rooms,
        nbrToilets: normalizedCounts.toilets,
      };
    case 'Shop':
      return {
        nbrRooms: normalizedCounts.rooms,
        nbrToilet: toNonNegativeInt(item.nbrToilet, normalizedCounts.toilets),
      };
    case 'Kiosk':
      return {
        kioskType: normalizeText(item.kioskType),
      };
    case 'Room':
      return {
        roomType: normalizeText(item.roomType),
      };
    default:
      return {};
  }
}

function normalizeTags(tagsLike, sellerType) {
  const mandatorySellerTag = sellerType === 'agency' ? 'Agence' : 'Propriétaire';
  const modelTags = Array.isArray(tagsLike)
    ? tagsLike.map((tag) => normalizeText(tag)).filter(Boolean)
    : [];
  return [mandatorySellerTag, ...modelTags]
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .slice(0, 6);
}

module.exports = {
  name: '05-map-property',
  async execute(context) {
    const sellerType = context.agency?.key ? 'agency' : 'owner';

    const mapped = (context.artifacts.enrichedPosts || []).map((item, index) => {
      const sourceText = [
        item.rawText || '',
        item.title || '',
        item.description || '',
      ]
        .join(' ')
        .trim();

      const typeProperty = resolveTypeProperty(item, sourceText);
      const location = normalizeLocation(item.location);
      const status = resolveStatus(item, typeProperty, sourceText);
      const price = resolvePrice(item, sourceText);
      const tags = normalizeTags(item.tags, sellerType);

      return {
        id: `${context.agency.key}-${context.job.id}-${index + 1}`,
        title: normalizeText(item.title),
        description: normalizeText(item.description),
        typeProperty,
        price,
        area: toNonNegativeNumber(item.area, 0),
        status,
        tags,
        images: (item.imageUrls || []).map((url) => ({ fileURL: url })),
        contact: normalizeText(item.contact),
        address: {
          district: location.district,
          city: location.city,
          province: location.province,
        },
        street: location.district,
        city: location.city,
        province: location.province,
        longitude: location.lon,
        latitude: location.lat,
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
        ...buildTypeSpecificFields(item, typeProperty, sourceText),
      };
    });

    context.artifacts.mappedProperties = mapped;
    context.metrics.totalMapped = mapped.length;
    context.logger.info('Properties mapped', { totalMapped: mapped.length });
  },
};
