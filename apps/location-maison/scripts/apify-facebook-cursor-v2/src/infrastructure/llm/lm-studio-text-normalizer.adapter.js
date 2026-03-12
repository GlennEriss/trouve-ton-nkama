const { TextNormalizerPort } = require('../../application/ports/text-normalizer.port');
const { AppError } = require('../../shared/errors/app-error');
const { ALLOWED_TAGS } = require('../../domain/services/tag-selector');

const TYPE_MAP = {
  appartement: 'Apartment',
  apartment: 'Apartment',
  studio: 'Studio',
  maison: 'Home',
  home: 'Home',
  villa: 'Villa',
  terrain: 'Land',
  land: 'Land',
  immeuble: 'Building',
  building: 'Building',
  bureau: 'Desk',
  desk: 'Desk',
  local: 'Shop',
  boutique: 'Shop',
  shop: 'Shop',
  kiosque: 'Kiosk',
  kiosk: 'Kiosk',
  chambre: 'Room',
  room: 'Room',
};

const DEFAULT_TAGS = ALLOWED_TAGS;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(baseUrl, endpointPath) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const endpoint = String(endpointPath || '').trim();
  if (!endpoint) return base;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function removeNoise(value) {
  return String(value || '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, ' ')
    .replace(/[#*_]/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeNoisePreserveLines(value) {
  return String(value || '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, ' ')
    .replace(/[#*_]/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseJsonObject(value) {
  if (value && typeof value === 'object') return value;
  const text = String(value || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_errorNested) {
      return null;
    }
  }
}

function toPositiveInt(value, fallback = 0) {
  const numeric = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

function isLikelyPhoneLikePrice(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return false;
  return /^(?:241)?0?[67]\d{7}$/.test(digits) || /^[67]\d{7}$/.test(digits);
}

function normalizePrice(value, { status, fallback = 0 } = {}) {
  const parsed = toPositiveInt(value, 0);
  const fallbackPrice = toPositiveInt(fallback, 0);
  if (!parsed) return fallbackPrice;

  if (isLikelyPhoneLikePrice(parsed)) return fallbackPrice;

  const normalizedStatus = normalizeStatus(status, 'FOR_RENT');
  if (normalizedStatus === 'FOR_RENT' && parsed > 20_000_000) {
    return fallbackPrice;
  }

  if (parsed > 5_000_000_000) return fallbackPrice;
  return parsed;
}

function normalizeType(value, fallback = 'Home') {
  const normalized = normalizeText(value);
  return TYPE_MAP[normalized] || fallback;
}

function normalizeStatus(value, fallback = 'FOR_RENT') {
  const normalized = normalizeText(value);
  if (normalized === 'for_sale' || normalized === 'sale' || normalized.includes('vendre')) return 'FOR_SALE';
  if (normalized === 'for_rent' || normalized === 'rent' || normalized.includes('louer')) return 'FOR_RENT';
  return fallback;
}

function normalizeContact(value, fallback = '') {
  const text = String(value || fallback || '');
  const match = text.match(/(?:\+241[\s.-]?)?(?:0[\s.-]?)?[67](?:[\s.-]?\d){6,8}/);
  if (!match) return fallback || '';
  const cleaned = match[0].replace(/[^\d+]/g, '');
  return cleaned || fallback || '';
}

function normalizeTags(value, fallback = []) {
  if (!Array.isArray(value)) return Array.isArray(fallback) ? fallback : [];
  const clean = value
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 30));
  return [...new Set(clean)].slice(0, 10);
}

function stripPriceFromTitle(value) {
  return String(value || '')
    .replace(/\b\d{1,3}(?:[ .]\d{3})+\s*(?:f(?:\s*cfa)?|fcfa|xaf|cfa)?\b/gi, ' ')
    .replace(/\b\d{5,9}\s*(?:f(?:\s*cfa)?|fcfa|xaf|cfa)\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mille|k|million|millions)\b/gi, ' ')
    .replace(/\s*[-–—]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanTitle(value, fallback) {
  const candidate = stripPriceFromTitle(
    removeNoise(value || fallback || 'Annonce immobilière')
    .replace(/(?:\+?241[\s.-]?)?(?:0[\s.-]?)?[67](?:[\s.-]?\d){6,8}/g, ' ')
    .replace(/\b(contact|tel|t[eé]l[eé]phone|whatsapp|inbox|mp)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  );
  if (!candidate) return 'Annonce immobilière';
  return candidate.length > 95 ? `${candidate.slice(0, 92).trim()}...` : candidate;
}

function removeContactMentions(value) {
  return String(value || '')
    .replace(/(?:\+?241[\s.-]?)?(?:0[\s.-]?)?[67](?:[\s.-]?\d){6,8}/g, ' ')
    .replace(/\b(contact|t[eé]l(?:[eé]phone)?|telephone|whatsapp|appel(?:ez)?|joignable|inbox|mp)\b\s*[:\-]?\s*/gi, '')
    .replace(/\b(?:au|au\s+num[eé]ro)\b\s*[:\-]?\s*/gi, '')
    .replace(/(?:\s*\.\s*){2,}/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n[ \t]*\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanDescription(value, fallback) {
  const source = String(value || fallback || 'Description non renseignée');
  const cleaned = removeContactMentions(
    removeNoisePreserveLines(source)
    .replace(/\bdetails?\s*:\s*/gi, '')
    .trim()
  );
  return cleaned.length > 1200 ? `${cleaned.slice(0, 1197).trim()}...` : cleaned;
}

function restoreFrenchAccents(value) {
  return String(value || '')
    .replace(/\b([Aa])\s+louer\b/g, (_m, first) => `${first === 'A' ? 'À' : 'à'} louer`)
    .replace(/\b([Aa])\s+vendre\b/g, (_m, first) => `${first === 'A' ? 'À' : 'à'} vendre`)
    .replace(/\bCaracteristiques\b/gi, (m) => (m[0] === 'C' ? 'Caractéristiques' : 'caractéristiques'))
    .replace(/\bRez-de-chaussee\b/gi, 'Rez-de-chaussée')
    .replace(/\betage\b/gi, (m) => (m[0] === 'E' ? 'Étage' : 'étage'))
    .replace(/\bsejour\b/gi, (m) => (m[0] === 'S' ? 'Séjour' : 'séjour'))
    .replace(/\belectrogene\b/gi, (m) => (m[0] === 'E' ? 'Électrogène' : 'électrogène'))
    .replace(/\ba (?=[A-ZÀ-ÖØ-Ý])/g, 'à ')
    .replace(/([\s,:;])a (?=(akanda|libreville|angondje|owendo|okala|nzeng|estuaire|malibe)\b)/gi, '$1à ');
}

function normalizeLocation(candidate, fallbackLocation = {}) {
  const location = candidate && typeof candidate === 'object' ? candidate : {};
  return {
    district: String(location.district || fallbackLocation.district || '').trim(),
    city: String(location.city || fallbackLocation.city || '').trim(),
    province: String(location.province || fallbackLocation.province || '').trim(),
    lon: Number(location.lon ?? fallbackLocation.lon ?? 0) || 0,
    lat: Number(location.lat ?? fallbackLocation.lat ?? 0) || 0,
  };
}

function extractRoomsHint(text, fallback = 0) {
  const match = normalizeText(text).match(/(\d+)\s*chambres?/);
  if (!match) return fallback;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function reconcileTypeProperty(typeProperty, rooms, contentText, fallbackType = 'Home') {
  const text = normalizeText(contentText);
  let type = typeProperty || fallbackType || 'Home';

  if ((type === 'Studio' || type === 'Room') && rooms >= 2) {
    if (/\bappartement\b/.test(text)) return 'Apartment';
    if (/\bmaison\b/.test(text)) return 'Home';
    if (/\bvilla\b/.test(text)) return 'Villa';
    if (fallbackType && fallbackType !== 'Studio' && fallbackType !== 'Room') return fallbackType;
    return 'Apartment';
  }

  return type;
}

function isLowQualityTitle(title) {
  const value = String(title || '').trim();
  if (!value || value.length < 12) return true;
  if (/#|https?:\/\//i.test(value)) return true;
  if (/^\s*chambre\s+\d+\s+chambres?\b/i.test(value)) return true;
  const normalized = normalizeText(value).replace(/\s+/g, ' ').trim();
  if (
    /^(appartement|maison|villa|studio|chambre|terrain|immeuble|bureau|local commercial|kiosque)(?: de \d+ chambres?)?\s+a\s+(louer|vendre)(?:\s+a\s+[a-z0-9 -]+)?$/.test(normalized)
  ) {
    return true;
  }
  return false;
}

function titleLooksIncoherentWithType(title, typeProperty) {
  const normalized = normalizeText(title);
  if (!normalized) return false;
  if (typeProperty === 'Apartment' && /\bstudio|chambre\b/.test(normalized)) return true;
  if (typeProperty === 'Studio' && /\bappartement|maison|villa\b/.test(normalized)) return true;
  if (typeProperty === 'Home' && /\bappartement|studio\b/.test(normalized)) return true;
  return false;
}

function isLowQualityDescription(description) {
  const value = String(description || '').trim();
  if (!value || value.length < 35) return true;
  if (/\.\.\./.test(value)) return true;
  if (/https?:\/\/|www\./i.test(value)) return true;
  if (/\b(flypviral|whatsapp|inbox)\b/i.test(value)) return true;
  const sentenceCount = value.split(/[.!?]\s+/).filter(Boolean).length;
  return sentenceCount < 1;
}

function buildPromptPayload(record, defaults, fallback, locationHints) {
  return {
    task: 'Transformer un post immobilier brut en annonce JSON professionnelle',
    locale: 'fr-GA',
    constraints: [
      'Renvoyer strictement un JSON valide',
      'Ne pas inventer des informations absentes',
      'Titre court et professionnel sans emojis/hashtags',
      'Titre en francais naturel, style annonce premium (pas de titre generique)',
      'Titre doit inclure au moins un element distinctif utile (zone ou atout principal)',
      'Interdit: titres du style "Chambre a louer" ou "Appartement a louer"',
      'Interdit: mettre le prix dans le titre',
      'Description professionnelle et lisible',
      'Ne jamais inclure un numero de telephone dans le titre ou la description',
      'Ne jamais inclure de mention Contact, WhatsApp, Inbox ou MP dans la description',
      'Description en style annonce professionnelle, claire et concise',
      'typeProperty doit être dans: Home, Apartment, Studio, Villa, Land, Desk, Building, Shop, Kiosk, Room',
      'status doit être FOR_RENT ou FOR_SALE',
      'price entier en FCFA, 0 si inconnu',
    ],
    allowedTags: DEFAULT_TAGS,
    locationReference: locationHints
      ? {
          instruction:
            'Utilise en priorite ces noms de zones OSM pour district/city/province si une correspondance existe.',
          provinces: locationHints.provinces || [],
          cities: locationHints.cities || [],
          quarters: locationHints.quarters || [],
        }
      : null,
    defaults: {
      country: defaults.country || 'Gabon',
      countryCode: defaults.countryCode || 'GA',
      statusDefault: defaults.statusDefault || 'FOR_RENT',
    },
    rawPost: {
      sourceId: record.sourceId,
      text: record.rawText || '',
      imageUrls: Array.isArray(record.imageUrls) ? record.imageUrls.slice(0, 3) : [],
    },
    expectedSchema: {
      title: 'string',
      description: 'string',
      typeProperty: 'string',
      status: 'string',
      price: 'number',
      contact: 'string',
      tags: ['string'],
      area: 'number',
      nbrRooms: 'number',
      nbrChickens: 'number',
      nbrBathrooms: 'number',
      nbrToilets: 'number',
      nbrLivingRoom: 'number',
      location: {
        district: 'string',
        city: 'string',
        province: 'string',
        lon: 'number',
        lat: 'number',
      },
    },
    fallback,
  };
}

class LmStudioTextNormalizerAdapter extends TextNormalizerPort {
  constructor(options = {}) {
    super();
    this.config = {
      enabled: Boolean(options.enabled),
      baseUrl: String(options.baseUrl || 'http://127.0.0.1:1234').replace(/\/$/, ''),
      model: String(options.model || 'qwen2.5-1.5b-instruct'),
      chatEndpoint: String(options.chatEndpoint || '/api/v1/chat'),
      modelsEndpoint: String(options.modelsEndpoint || '/api/v1/models'),
      loadModelEndpoint: String(options.loadModelEndpoint || '/api/v1/models/load'),
      autoLoadModel: Boolean(options.autoLoadModel),
      useResponseFormat: Boolean(options.useResponseFormat),
      temperature: Number(options.temperature ?? 0.2),
      maxTokens: Number(options.maxTokens ?? 700),
      timeoutMs: Number(options.timeoutMs ?? 45000),
      maxRetries: Number(options.maxRetries ?? 2),
      delayMsBetweenRequests: Number(options.delayMsBetweenRequests ?? 100),
    };
    this.modelChecked = false;
  }

  async fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) {
        const body = await response.text();
        throw new AppError('LM Studio request failed', {
          code: 'LM_STUDIO_HTTP_ERROR',
          status: response.status,
          details: { url, body: body.slice(0, 300) },
        });
      }
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async ensureModelAvailable() {
    if (this.modelChecked) return;

    const modelsUrl = buildUrl(this.config.baseUrl, this.config.modelsEndpoint);
    let modelsPayload;
    try {
      modelsPayload = await this.fetchJson(modelsUrl, { method: 'GET' });
    } catch (error) {
      // Ne pas bloquer la pipeline si l'endpoint models n'est pas dispo.
      this.modelChecked = true;
      return;
    }

    const models = Array.isArray(modelsPayload)
      ? modelsPayload
      : Array.isArray(modelsPayload?.data)
        ? modelsPayload.data
        : Array.isArray(modelsPayload?.models)
          ? modelsPayload.models
          : [];

    const hasModel = models.some((item) => {
      const id = String(item?.id || item?.name || item?.model || '').toLowerCase();
      return id === this.config.model.toLowerCase();
    });

    if (hasModel) {
      this.modelChecked = true;
      return;
    }

    if (!this.config.autoLoadModel) {
      throw new AppError(`LM Studio model not loaded: ${this.config.model}`, {
        code: 'LM_STUDIO_MODEL_NOT_LOADED',
        status: 400,
      });
    }

    const loadUrl = buildUrl(this.config.baseUrl, this.config.loadModelEndpoint);
    await this.fetchJson(loadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.config.model }),
    });

    this.modelChecked = true;
  }

  extractMessageContent(responseJson) {
    return (
      responseJson?.choices?.[0]?.message?.content ||
      responseJson?.choices?.[0]?.text ||
      responseJson?.message?.content ||
      responseJson?.message ||
      responseJson?.response ||
      responseJson?.output ||
      responseJson?.content ||
      null
    );
  }

  async callModel(payload) {
    await this.ensureModelAvailable();

    const chatUrl = buildUrl(this.config.baseUrl, this.config.chatEndpoint);
    const requestBody = {
      model: this.config.model,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            'Tu es un assistant d extraction immobiliere. Tu dois renvoyer uniquement un objet JSON valide, sans markdown.',
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
    };

    if (this.config.useResponseFormat) {
      requestBody.response_format = { type: 'json_object' };
    }

    const json = await this.fetchJson(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const content = this.extractMessageContent(json);
    const parsed = parseJsonObject(content);
    if (!parsed) {
      throw new AppError('LM Studio response is not valid JSON object', {
        code: 'LM_STUDIO_INVALID_JSON',
        status: 422,
        details: { contentPreview: String(content || '').slice(0, 200) },
      });
    }

    return parsed;
  }

  normalizeModelOutput(candidate, fallbackRecord) {
    const fallback = fallbackRecord || {};
    const fallbackLocation = fallback.location || {};
    const rawTitle = restoreFrenchAccents(cleanTitle(candidate.title, fallback.title));
    const rawDescription = restoreFrenchAccents(cleanDescription(candidate.description, fallback.description));
    const parsedRooms = toPositiveInt(candidate.nbrRooms, toPositiveInt(fallback.nbrRooms, 0));
    const rooms = parsedRooms || extractRoomsHint(`${rawTitle} ${rawDescription}`, toPositiveInt(fallback.nbrRooms, 0));
    const typeFromModel = normalizeType(candidate.typeProperty, fallback.typeProperty || 'Home');
    const finalType = reconcileTypeProperty(typeFromModel, rooms, `${rawTitle} ${rawDescription}`, fallback.typeProperty || 'Home');
    const fallbackTitle = restoreFrenchAccents(cleanTitle(fallback.title, rawTitle));
    const fallbackDescription = restoreFrenchAccents(cleanDescription(fallback.description, rawDescription));

    const useFallbackTitle =
      isLowQualityTitle(rawTitle) ||
      titleLooksIncoherentWithType(rawTitle, finalType);
    const useFallbackDescription =
      isLowQualityDescription(rawDescription) &&
      !isLowQualityDescription(fallbackDescription);

    const finalTitle = useFallbackTitle ? fallbackTitle : rawTitle;
    const finalDescription = useFallbackDescription ? fallbackDescription : rawDescription;
    const normalizedStatus = normalizeStatus(candidate.status, fallback.status || 'FOR_RENT');
    const normalizedContact = normalizeContact(candidate.contact, fallback.contact || '');
    const normalizedPrice = normalizePrice(candidate.price, {
      status: normalizedStatus,
      fallback: fallback.price,
    });

    return {
      title: finalTitle,
      description: finalDescription,
      typeProperty: finalType,
      status: normalizedStatus,
      price: normalizedPrice,
      contact: normalizedContact,
      tags: normalizeTags(candidate.tags, fallback.tags || []),
      area: toPositiveInt(candidate.area, toPositiveInt(fallback.area, 0)),
      nbrRooms: rooms,
      nbrChickens: toPositiveInt(candidate.nbrChickens, toPositiveInt(fallback.nbrChickens, 0)),
      nbrBathrooms: toPositiveInt(candidate.nbrBathrooms, 0),
      nbrToilets: toPositiveInt(candidate.nbrToilets, 0),
      nbrLivingRoom: toPositiveInt(candidate.nbrLivingRoom, 0),
      location: normalizeLocation(candidate.location, fallbackLocation),
    };
  }

  async normalizeRecord(record, context = {}) {
    const defaults = context.defaults || {};
    const fallback = context.fallbackRecord || {};
    const payload = buildPromptPayload(record, defaults, fallback, context.locationHints || null);

    let lastError = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      try {
        if (attempt > 0) {
          await wait(350 * attempt);
        }
        const raw = await this.callModel(payload);
        if (this.config.delayMsBetweenRequests > 0) {
          await wait(this.config.delayMsBetweenRequests);
        }
        return this.normalizeModelOutput(raw, fallback);
      } catch (error) {
        lastError = error;
      }
    }

    throw new AppError('LM Studio normalization failed after retries', {
      code: 'LM_STUDIO_NORMALIZATION_FAILED',
      status: 502,
      details: { message: lastError?.message || 'Unknown error' },
    });
  }
}

module.exports = { LmStudioTextNormalizerAdapter };
