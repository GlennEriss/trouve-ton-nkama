const { toSingleLine } = require('../../shared/utils/text');

const TYPE_LABELS_FR = {
  Apartment: 'Appartement',
  Home: 'Maison',
  Villa: 'Villa',
  Studio: 'Studio',
  Land: 'Terrain',
  Building: 'Immeuble',
  Desk: 'Bureau',
  Shop: 'Local commercial',
  Kiosk: 'Kiosque',
  Room: 'Chambre',
};

function removeDecorations(value) {
  return String(value || '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, ' ')
    .replace(/[\u200B-\u200D]/g, ' ')
    .replace(/[#*_]/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/[.]{3,}/g, '. ')
    .replace(/[\u00A0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toInteger(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function isLikelyPhoneNumber(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return false;

  // Gabon local formats (with or without country code/leading 0).
  // Accept 7-9 local digits to catch malformed captures like "7682457".
  if (/^(?:241)?0?[67]\d{6,7}$/.test(digits)) return true;

  // Generic mobile-like captures in scraped posts.
  if (/^[67]\d{6,7}$/.test(digits)) return true;

  return false;
}

function parsePriceCandidate(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 0;

  const scaled = raw.match(/^(\d+(?:[.,]\d+)?)\s*(mille|mil|k|m|million|millions)$/);
  if (scaled) {
    const base = Number(scaled[1].replace(',', '.'));
    if (!Number.isFinite(base)) return 0;
    const unit = scaled[2];
    // In local listings, "mil" and "m" are usually shorthand for thousand.
    if (unit === 'mille' || unit === 'mil' || unit === 'k' || unit === 'm') {
      return Math.round(base * 1000);
    }
    return Math.round(base * 1000000);
  }

  if (/\d{1,3}(?:[\s.]\d{3})+/.test(raw)) {
    return toInteger(raw);
  }

  return toInteger(raw);
}

function extractPrice(text) {
  const raw = String(text || '');
  const normalized = raw.toLowerCase();

  // Remove likely phone numbers before price extraction.
  // Keep monetary grouped formats (e.g. 175 000 000) untouched.
  const withoutPhones = normalized
    .replace(/(?:\+?241[\s.-]?)?(?:0?[67]\d{6,7}|0?[67](?:[\s.-]\d{2}){3,4})\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const contextualPatterns = [
    /\b(?:prix|loyer|montant|tarif|co[uû]t)\b\s*[:\-]?\s*((?:\d{1,3}(?:[\s.]\d{3})+)|(?:\d+(?:[.,]\d+)?\s*(?:mille|mil|k|m|million|millions)?)|(?:\d{5,10}))/g,
    /\b([0-9][0-9\s.,]{2,15}(?:\s*(?:mille|mil|k|m|million|millions))?)\s*(?:f(?:\s*cfa)?|fcfa|xaf|cfa)\b/g,
  ];

  for (const pattern of contextualPatterns) {
    let match;
    while ((match = pattern.exec(withoutPhones)) !== null) {
      const parsed = parsePriceCandidate(match[1]);
      if (parsed >= 10000 && parsed <= 2_000_000_000) {
        return parsed;
      }
    }
  }

  // 350.000 / 350 000 / 1 200 000
  const groupedMatch = withoutPhones.match(/\b(\d{1,3}(?:[\s.]\d{3})+)\b/);
  if (groupedMatch) {
    const parsed = parsePriceCandidate(groupedMatch[1]);
    if (parsed >= 10000 && parsed <= 2_000_000_000) {
      return parsed;
    }
  }

  // 190 mille / 190k / 1.2 million
  const scaledMatch = withoutPhones.match(/\b(\d+(?:[.,]\d+)?)\s*(mille|mil|k|m|million|millions)\b/);
  if (scaledMatch) {
    const parsed = parsePriceCandidate(`${scaledMatch[1]} ${scaledMatch[2]}`);
    if (parsed >= 10000 && parsed <= 2_000_000_000) {
      return parsed;
    }
  }

  const directMatches = withoutPhones.match(/\b(\d{5,10})\b/g) || [];
  for (const candidate of directMatches) {
    if (isLikelyPhoneNumber(candidate)) continue;
    const parsed = parsePriceCandidate(candidate);
    if (parsed >= 10000 && parsed <= 2_000_000_000) return parsed;
  }

  return 0;
}

function extractStatus(text, fallback) {
  const normalized = String(text || '').toLowerCase();
  if (/\b(vente|en vente|a vendre|à vendre|vendre|vendu|vendue|cession)\b/.test(normalized)) {
    return 'FOR_SALE';
  }
  if (/\b(loyer|location|a louer|à louer|loue|loue[e]?|bail)\b/.test(normalized)) {
    return 'FOR_RENT';
  }
  return fallback || 'FOR_RENT';
}

function normalizeGabonContact(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';

  if (digitsOnly.startsWith('241')) {
    return `+${digitsOnly}`;
  }

  return `+241${digitsOnly}`;
}

function extractContact(text) {
  const match = String(text || '').match(/(?:\+241[\s.-]?)?(?:0[\s.-]?)?[67](?:[\s.-]?\d){6,8}/);
  if (!match) return '';
  return normalizeGabonContact(match[0]);
}

function countMatches(text, regex) {
  const matches = String(text || '').match(regex);
  return matches ? matches.length : 0;
}

function extractTypeProperty(text, rooms = 0) {
  const normalized = String(text || '').toLowerCase();
  const scores = {
    Apartment: countMatches(normalized, /\bappartement?s?\b/g) * 4,
    Studio: countMatches(normalized, /\bstudio?s?\b/g) * 4,
    Villa: countMatches(normalized, /\bvilla?s?\b/g) * 4 + countMatches(normalized, /\bduplex\b/g) * 2,
    Land: countMatches(normalized, /\bterrain|parcelle|hectare\b/g) * 4,
    Building: countMatches(normalized, /\bimmeuble\b/g) * 4,
    Desk: countMatches(normalized, /\bbureau[x]?\b/g) * 4,
    Shop: countMatches(normalized, /\bboutique|local commercial|magasin\b/g) * 4,
    Kiosk: countMatches(normalized, /\bkiosque\b/g) * 4,
    Room: countMatches(normalized, /\bchambre\b/g) * 2,
    Home: countMatches(normalized, /\bmaison\b/g) * 4,
  };

  let detectedType = 'Home';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      detectedType = type;
    }
  }

  if (detectedType === 'Studio' && rooms >= 2) {
    if (scores.Apartment > 0) return 'Apartment';
    if (scores.Home > 0) return 'Home';
  }

  if (detectedType === 'Room' && rooms >= 2) {
    if (scores.Apartment > 0) return 'Apartment';
    if (scores.Home > 0) return 'Home';
  }

  return bestScore > 0 ? detectedType : 'Home';
}

function extractCount(text, keywordRegex) {
  const match = String(text || '').toLowerCase().match(new RegExp(`(\\d+)\\s*${keywordRegex}`, 'i'));
  if (!match) return 0;
  return parseInt(match[1], 10) || 0;
}

function extractDistrict(text) {
  const normalized = removeDecorations(text).toLowerCase();
  const quartierMatch = normalized.match(/\bquartier\s+([a-z0-9\- ]{2,45})/i);
  if (quartierMatch) {
    const district = quartierMatch[1]
      .replace(/\b(loyer|prix|usage|contact|whatsapp|tel|telephone)\b.*$/i, '')
      .trim();
    if (district.length >= 3) return district;
  }

  const knownAreaMatch = normalized.match(
    /\b(akanda(?:[- ]angondje)?|angondje|okala|owendo|nzeng(?:[- ]ayong)?|charbonnages?|pk\d{1,2}|bikele|malibe|santa clara)\b/i
  );
  return knownAreaMatch ? knownAreaMatch[1] : '';
}

function formatPrice(price) {
  if (!price || !Number.isFinite(price)) return '';
  return `${Math.round(price).toLocaleString('fr-FR')} FCFA`;
}

function capitalizeWords(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const TITLE_META = {
  Apartment: { noun: 'appartement', gender: 'm' },
  Home: { noun: 'maison', gender: 'f' },
  Villa: { noun: 'villa', gender: 'f' },
  Studio: { noun: 'studio', gender: 'm' },
  Land: { noun: 'terrain', gender: 'm' },
  Building: { noun: 'immeuble', gender: 'm' },
  Desk: { noun: 'bureau', gender: 'm' },
  Shop: { noun: 'local commercial', gender: 'm' },
  Kiosk: { noun: 'kiosque', gender: 'm' },
  Room: { noun: 'chambre', gender: 'f' },
};

function pickTitleQualifier(rawText, gender) {
  const normalized = String(rawText || '').toLowerCase();
  const feminine = gender === 'f';

  if (/\b(haut standing|standing|luxueux|luxueuse|premium)\b/.test(normalized)) {
    return { value: 'de standing', position: 'suffix' };
  }
  if (/\b(neuf|neuve|1(?:er|ere|ère)\s*main|premi[eè]re\s*main)\b/.test(normalized)) {
    return { value: feminine ? 'Nouvelle' : 'Nouveau', position: 'prefix' };
  }
  if (/\bmoderne\b/.test(normalized)) return { value: 'moderne', position: 'suffix' };
  if (/\bspacieux|spacieuse|vaste|grand|grande\b/.test(normalized)) {
    return { value: feminine ? 'spacieuse' : 'spacieux', position: 'suffix' };
  }
  if (/\bmeubl[ée]\b/.test(normalized)) return { value: feminine ? 'meublée' : 'meublé', position: 'suffix' };
  if (/\bs[ée]curis[ée]|cl[ôo]tur[ée]\b/.test(normalized)) {
    return { value: feminine ? 'sécurisée' : 'sécurisé', position: 'suffix' };
  }
  return { value: '', position: 'none' };
}

function pickTitleHighlights(rawText) {
  const normalized = String(rawText || '').toLowerCase();
  const candidates = [];

  if (/\bpiscine\b/.test(normalized)) candidates.push('piscine');
  if (/\bterrasse\b/.test(normalized)) candidates.push('terrasse');
  if (/\bbalcon\b/.test(normalized)) candidates.push('balcon');
  if (/\bparking\b/.test(normalized)) candidates.push('parking');
  if (/\bclim|split\b/.test(normalized)) candidates.push('climatisation');
  if (/\bgardien\b/.test(normalized)) candidates.push('gardien');
  if (/\bsous barri[èe]re|s[ée]curis[ée]|cl[ôo]tur[ée]\b/.test(normalized)) candidates.push('sécurité renforcée');
  if (/\bcuisine\b/.test(normalized)) candidates.push('cuisine');

  return [...new Set(candidates)].slice(0, 2);
}

function buildProfessionalTitle(params) {
  const {
    typeProperty,
    status,
    rooms,
    district,
    city,
    rawText,
  } = params;

  const meta = TITLE_META[typeProperty] || { noun: 'bien immobilier', gender: 'm' };
  const qualifier = pickTitleQualifier(rawText, meta.gender);
  const nounBase = meta.noun;
  const action = status === 'FOR_SALE' ? 'à vendre' : 'à louer';
  const canShowRoomCount = ['Apartment', 'Home', 'Villa'].includes(typeProperty);
  const roomLabel =
    rooms > 0 && canShowRoomCount
      ? ` de ${rooms} chambre${rooms > 1 ? 's' : ''}`
      : '';
  const nounPart =
    qualifier.position === 'suffix' && qualifier.value
      ? `${nounBase}${roomLabel} ${qualifier.value}`
      : `${nounBase}${roomLabel}`;

  const locationRaw = district || city || '';
  const location = locationRaw ? ` à ${capitalizeWords(locationRaw)}` : '';
  let highlights = pickTitleHighlights(rawText);
  if (/sécuris/i.test(qualifier.value || '')) {
    highlights = highlights.filter((item) => item !== 'sécurité renforcée');
  }
  const highlightPart =
    highlights.length === 0
      ? ''
      : highlights.length === 1
        ? ` avec ${highlights[0]}`
        : ` avec ${highlights[0]} et ${highlights[1]}`;

  const lead = qualifier.position === 'prefix' && qualifier.value ? `${qualifier.value} ${nounPart}` : nounPart;
  const normalizeStart = (value) => value.charAt(0).toUpperCase() + value.slice(1);
  let title = `${normalizeStart(lead)} ${action}${location}${highlightPart}`
    .replace(/\s+/g, ' ')
    .trim();
  if (title.length > 105) {
    title = `${title.slice(0, 102).trim()}...`;
  }
  return title || 'Annonce immobilière';
}

function buildFeatureList(rawText, rooms, bathrooms, livingRooms) {
  const normalized = String(rawText || '').toLowerCase();
  const features = [];

  if (rooms > 0) features.push(`${rooms} chambre${rooms > 1 ? 's' : ''}`);
  if (bathrooms > 0) features.push(`${bathrooms} salle${bathrooms > 1 ? 's' : ''} d'eau`);
  if (livingRooms > 0) features.push(`${livingRooms} salon${livingRooms > 1 ? 's' : ''}`);
  if (/\bcuisine\b/.test(normalized)) features.push('cuisine');
  if (/\bbalcon\b/.test(normalized)) features.push('balcon');
  if (/\bparking\b/.test(normalized)) features.push('parking');
  if (/\bgardien\b/.test(normalized)) features.push('gardien');
  if (/\bmeubl[ée]?\b/.test(normalized)) features.push('meuble');

  return [...new Set(features)];
}

function toSentenceCase(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function extractUsage(rawText) {
  const normalized = String(rawText || '').toLowerCase();
  const hasHabitation = /\bhabitation\b/.test(normalized);
  const hasBureau = /\bbureau[x]?\b/.test(normalized);
  const hasCommerce = /\bcommercial|commerce|boutique|magasin\b/.test(normalized);

  if (hasHabitation && hasBureau) return 'Habitation ou bureau';
  if (hasHabitation && hasCommerce) return 'Habitation ou usage commercial';
  if (hasBureau) return 'Bureau';
  if (hasCommerce) return 'Commercial';
  if (hasHabitation) return 'Habitation';
  return '';
}

function extractFloorInfo(rawText) {
  const normalized = String(rawText || '').toLowerCase();
  if (/\b(rez[- ]de[- ]chauss[ée]e|rdc)\b/.test(normalized)) return 'Rez-de-chaussée';
  const floorMatch = normalized.match(/\b(\d{1,2})(?:er|e|eme)?\s*(?:etage|[èe]me etage)\b/);
  if (floorMatch) return `${floorMatch[1]}e étage`;
  return '';
}

function extractAtouts(rawText) {
  const normalized = String(rawText || '').toLowerCase();
  const atouts = [];
  if (/\bclim|split\b/.test(normalized)) atouts.push('climatisation');
  if (/\bchauffe[- ]eau\b/.test(normalized)) atouts.push('chauffe-eau');
  if (/\bsuppresseur\b/.test(normalized)) atouts.push('suppresseur');
  if (/\bgroupe electrog|groupe [ée]lectrog[èe]ne\b/.test(normalized)) atouts.push('groupe électrogène');
  if (/\bcuve\b/.test(normalized)) atouts.push('cuve');
  if (/\bsans charges\b/.test(normalized)) atouts.push('sans charges');
  if (/\bcharges comprises|tout(es)? charges?\b/.test(normalized)) atouts.push('charges comprises');
  return [...new Set(atouts)];
}

function buildProfessionalDescription(params) {
  const {
    typeProperty,
    status,
    price,
    rawText,
    district,
    city,
    rooms,
    bathrooms,
    livingRooms,
  } = params;

  const typeLabel = TYPE_LABELS_FR[typeProperty] || 'Bien immobilier';
  const action = status === 'FOR_SALE' ? 'à vendre' : 'à louer';
  const locationRaw = district || city || '';
  const location = locationRaw ? ` à ${capitalizeWords(locationRaw)}` : '';
  const lines = [`${typeLabel} ${action}${location}.`];

  const features = buildFeatureList(rawText, rooms, bathrooms, livingRooms);
  if (features.length > 0) {
    lines.push(`Caractéristiques: ${features.join(', ')}.`);
  }

  const atouts = extractAtouts(rawText);
  if (atouts.length > 0) {
    lines.push(`Atouts: ${atouts.join(', ')}.`);
  }

  const floorInfo = extractFloorInfo(rawText);
  if (floorInfo) {
    lines.push(`Niveau: ${floorInfo}.`);
  }

  const usage = extractUsage(rawText);
  if (usage) {
    lines.push(`Usage: ${usage}.`);
  }

  if (price > 0) {
    lines.push(`${status === 'FOR_SALE' ? 'Prix de vente' : 'Loyer'}: ${formatPrice(price)}.`);
  }

  return lines.join('\n');
}

class PropertyEnricher {
  enrich(record, defaults = {}) {
    const rawText = toSingleLine(record.rawText || '');
    const cleanedRawText = removeDecorations(rawText);
    const price = extractPrice(rawText);
    const status = extractStatus(rawText, defaults.statusDefault);
    const rooms = extractCount(rawText, 'chambres?');
    const typeProperty = extractTypeProperty(rawText, rooms);
    const contact = extractContact(rawText);
    const bathrooms = extractCount(rawText, "salles?\\s*(?:d['’]\\s*|de\\s*)?(?:bain|eau)");
    const kitchens = extractCount(rawText, 'cuisines?');
    const toilets = extractCount(rawText, 'toilettes?|wc');
    const livingRooms = extractCount(rawText, 'salons?');
    const district = extractDistrict(rawText);
    const normalizedKitchens =
      kitchens > 0 ? kitchens : /\bcuisine\b/i.test(rawText) ? 1 : 0;
    const normalizedToilets =
      toilets > 0 ? toilets : bathrooms > 0 ? bathrooms : /\bwc\b/i.test(rawText) ? 1 : 0;

    const title = buildProfessionalTitle({
      typeProperty,
      status,
      rooms,
      district,
      city: record.location?.city || '',
      rawText: cleanedRawText,
    });

    const description = buildProfessionalDescription({
      typeProperty,
      status,
      price,
      rawText: cleanedRawText,
      district,
      city: record.location?.city || '',
      rooms,
      bathrooms,
      livingRooms,
    });

    return {
      ...record,
      title,
      description,
      price,
      status,
      contact,
      typeProperty,
      location: {
        district: record.location?.district || district || '',
        city: record.location?.city || '',
        province: record.location?.province || '',
        lon: record.location?.lon || 0,
        lat: record.location?.lat || 0,
      },
      tags: Array.isArray(record.tags) ? record.tags : [],
      area: Number(record.area || 0),
      nbrRooms: Number(rooms || 0),
      nbrKitchens: Number(normalizedKitchens || 0),
      nbrBathrooms: Number(bathrooms || 0),
      nbrToilets: Number(normalizedToilets || 0),
      nbrLivingRoom: Number(livingRooms || 0),
    };
  }
}

module.exports = { PropertyEnricher };
