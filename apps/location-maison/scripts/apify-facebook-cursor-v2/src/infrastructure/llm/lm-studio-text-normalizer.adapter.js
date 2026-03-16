const { TextNormalizerPort } = require('../../application/ports/text-normalizer.port');
const { AppError } = require('../../shared/errors/app-error');

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

const SYSTEM_INSTRUCTION =
  'Tu es un extracteur immobilier. Reponds uniquement avec un objet JSON valide (sans markdown) avec les cles: title, description, typeProperty, status(FOR_RENT|FOR_SALE), price, contact, tags, area, nbrRooms, nbrKitchens, nbrBathrooms, nbrToilets, nbrLivingRoom, location{district,city,province,lon,lat}. Si une info manque: mettre "" ou 0 ou [] selon le type. Le texte source est la seule verite: n invente jamais. Titre: professionnel, clair, 6 a 14 mots, sans hashtags ni emojis, sans prix, sans devise, sans numero de telephone. Description: 3 a 5 phrases courtes, professionnelles, neutres et factuelles, en francais correct. Interdit dans description: prix, loyer numerique, caution numerique, frais numeriques, devises (FCFA, CFA, XAF, euro), dates precises, formulations degradantes/speculatives, capacite inventee, villes non presentes dans le texte source. Si visite mentionnee: ecrire seulement "Possibilite de visite".';

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
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (_errorNested) {
      return null;
    }
  }
}

function isLikelyNormalizedPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (
    'title' in value ||
    'description' in value ||
    'typeProperty' in value ||
    'status' in value ||
    'price' in value
  );
}

function toPositiveInt(value, defaultValue = 0) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;

  const scaled = raw.match(/^(\d+(?:[.,]\d+)?)\s*(mille|mil|k|m|million|millions)$/);
  if (scaled) {
    const base = Number(scaled[1].replace(',', '.'));
    if (!Number.isFinite(base) || base <= 0) return defaultValue;
    const unit = scaled[2];
    const multiplier =
      unit === 'mille' || unit === 'mil' || unit === 'k' || unit === 'm' ? 1000 : 1_000_000;
    return Math.round(base * multiplier);
  }

  const numeric = Number(raw.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return defaultValue;
  return Math.round(numeric);
}

function normalizeType(value, defaultType = 'Home') {
  const normalized = normalizeText(value);
  return TYPE_MAP[normalized] || defaultType;
}

function normalizeStatus(value, defaultStatus = 'FOR_RENT') {
  const normalized = normalizeText(value);
  if (normalized === 'for_sale' || normalized === 'sale' || normalized.includes('vendre')) return 'FOR_SALE';
  if (normalized === 'for_rent' || normalized === 'rent' || normalized.includes('louer')) return 'FOR_RENT';
  return defaultStatus;
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

function normalizeContact(value, defaultContact = '') {
  const text = String(value || defaultContact || '');
  const match = text.match(/(?:\+241[\s.-]?)?(?:0[\s.-]?)?[67](?:[\s.-]?\d){6,8}/);
  if (!match) return defaultContact || '';
  const normalized = normalizeGabonContact(match[0]);
  if (normalized) return normalized;
  return normalizeGabonContact(defaultContact) || defaultContact || '';
}

function normalizeTags(value, defaultTags = []) {
  if (!Array.isArray(value)) return Array.isArray(defaultTags) ? defaultTags : [];
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
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mille|mil|k|million|millions)\b/gi, ' ')
    .replace(/\s*[-–—]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanTitle(value, defaultTitle) {
  const candidate = stripPriceFromTitle(
    removeNoise(value || defaultTitle || 'Annonce immobilière')
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

function softenNegativePhrasing(value) {
  return String(value || '')
    .replace(/\bprobl[eè]me(?:s)?\s+de\s+parking\b/gi, '')
    .replace(/\bpas\s+de\s+parking\b/gi, '')
    .replace(/\bparking\s+insuffisant\b/gi, '')
    .replace(/\bprobl[eè]me(?:s)?\s+de\s+stationnement\b/gi, '');
}

function stripMonetaryMentions(value) {
  return String(value || '')
    .replace(
      /\b\d{1,3}(?:[ .]\d{3})+(?:\s*(?:f(?:\s*cfa)?|fcfa|xaf|cfa|euros?|€))?\b/gi,
      ' '
    )
    .replace(
      /\b\d+(?:[.,]\d+)?\s*(?:mille|mil|k|million|millions)(?:\s*(?:f(?:\s*cfa)?|fcfa|xaf|cfa|euros?|€))?\b/gi,
      ' '
    )
    .replace(/\b\d+\s*(?:f(?:\s*cfa)?|fcfa|xaf|cfa|euros?|€)\b/gi, ' ')
    .replace(/\b(?:fcfa|cfa|xaf|euros?|€)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanDescription(value, defaultDescription) {
  const source = String(value || defaultDescription || 'Description non renseignée');
  const sourceHasFeeMentions = /\b(caution|loyer|frais|agence|visite)\b/i.test(source);

  let cleaned = softenNegativePhrasing(removeContactMentions(
    removeNoisePreserveLines(source)
    .replace(/\bquartier\s+populaire\b/gi, 'quartier résidentiel')
    .replace(/\b(?:aucun|pas d['’]?)\s*acc[eè]s\s+automobile\s+possible\b/gi, '')
    .replace(/\bacc[eè]s\s+automobile\s+impossible\b/gi, '')
    .replace(/\b[ée]quip[ée]?\s+pour\s+accueillir\s+jusqu['’]?\s*[àa]\s*\d+\s*personnes?\b/gi, '')
    .replace(/\b(?:possibilit[eé]|possible)\s+de\s+visite\b[^.\n]*/gi, 'Possibilité de visite')
    .replace(/\bcaution\b[^.!?\n]*/gi, '')
    .replace(/\bloyer\b[^.!?\n]*/gi, '')
    .replace(/\bfrais\b[^.!?\n]*/gi, '')
    .replace(/\bprix\b[^.!?\n]*/gi, '')
    .replace(/\bdetails?\s*:\s*/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim()
  ));

  cleaned = stripMonetaryMentions(cleaned)
    .replace(/\s*[:;,]\s*(?=[.!?]|$)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (sourceHasFeeMentions && !/frais de caution/i.test(cleaned)) {
    cleaned = `${cleaned}${cleaned ? ' ' : ''}Frais de caution, de loyer, d'agence et de visite à prévoir.`;
  }

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

function normalizeLocation(candidate) {
  const location = candidate && typeof candidate === 'object' ? candidate : {};
  return {
    district: String(location.district || '').trim(),
    city: String(location.city || '').trim(),
    province: String(location.province || '').trim(),
    lon: Number(location.lon ?? 0) || 0,
    lat: Number(location.lat ?? 0) || 0,
  };
}

function extractRoomsHint(text, defaultRooms = 0) {
  const match = normalizeText(text).match(/(\d+)\s*chambres?/);
  if (!match) return defaultRooms;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultRooms;
}

function reconcileTypeProperty(typeProperty, rooms, contentText, defaultType = 'Home') {
  const text = normalizeText(contentText);
  let type = typeProperty || defaultType || 'Home';

  if ((type === 'Studio' || type === 'Room') && rooms >= 2) {
    if (/\bappartement\b/.test(text)) return 'Apartment';
    if (/\bmaison\b/.test(text)) return 'Home';
    if (/\bvilla\b/.test(text)) return 'Villa';
    if (defaultType && defaultType !== 'Studio' && defaultType !== 'Room') return defaultType;
    return 'Apartment';
  }

  return type;
}

function truncateForPrompt(value, max = 1800) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function buildPromptPayload(record) {
  return {
    text: truncateForPrompt(
      record.rawText || record.raw?.text || record.raw?.description || '',
      1700
    ),
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
      token: String(options.token || ''),
      tokenHeader: String(options.tokenHeader || 'Authorization'),
      tokenPrefix: String(options.tokenPrefix || 'Bearer'),
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

  buildAuthHeaders() {
    const token = String(this.config.token || '').trim();
    if (!token) return {};

    const headerName = String(this.config.tokenHeader || 'Authorization').trim() || 'Authorization';
    const prefixRaw = String(this.config.tokenPrefix || '').trim();
    const useRawToken =
      !prefixRaw || ['none', 'raw', 'token'].includes(prefixRaw.toLowerCase());
    const headerValue = useRawToken ? token : `${prefixRaw} ${token}`;

    return { [headerName]: headerValue };
  }

  async fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const authHeaders = this.buildAuthHeaders();
    const mergedHeaders = {
      ...(options.headers || {}),
      ...authHeaders,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text();
        throw new AppError('LM Studio request failed', {
          code: 'LM_STUDIO_HTTP_ERROR',
          status: response.status,
          details: { url, body: body.slice(0, 1200) },
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
    const outputText =
      typeof responseJson?.output_text === 'string'
        ? responseJson.output_text
        : null;
    if (outputText) return outputText;

    const nestedOutputText = Array.isArray(responseJson?.output)
      ? responseJson.output
          .flatMap((entry) => {
            if (typeof entry?.content === 'string') return [entry.content];
            if (Array.isArray(entry?.content)) return entry.content;
            return [];
          })
          .map((chunk) =>
            typeof chunk === 'string' ? chunk : chunk?.text || chunk?.output_text || chunk?.content || ''
          )
          .find(Boolean)
      : null;
    if (nestedOutputText) return nestedOutputText;

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
    const chatEndpoint = String(this.config.chatEndpoint || '').toLowerCase();
    const inputOnlyEndpoint = /\/api\/v1\/chat\/?$/.test(chatEndpoint);
    const userContent = String(payload?.text || '').trim();
    if (!userContent) {
      throw new AppError('LM Studio prompt text is empty', {
        code: 'LM_STUDIO_EMPTY_PROMPT',
        status: 400,
      });
    }
    const inputVariants = [
      {
        name: 'responses-input-text',
        body: {
          model: this.config.model,
          temperature: this.config.temperature,
          max_output_tokens: this.config.maxTokens,
          input: `${SYSTEM_INSTRUCTION}\n\n${userContent}`,
        },
      },
    ];

    const chatMessagesVariant = {
      name: 'chat-messages',
      body: {
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: userContent },
        ],
        ...(this.config.useResponseFormat ? { response_format: { type: 'json_object' } } : {}),
      },
    };

    const requestVariants = inputOnlyEndpoint
      ? inputVariants
      : [
          ...inputVariants,
          chatMessagesVariant,
        ];

    const variantErrors = [];

    for (let index = 0; index < requestVariants.length; index += 1) {
      const variant = requestVariants[index];
      try {
        const json = await this.fetchJson(chatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variant.body),
        });

        const content = this.extractMessageContent(json);
        const parsed = parseJsonObject(content);
        if (parsed) return parsed;

        if (isLikelyNormalizedPayload(json)) {
          return json;
        }

        if (!parsed) {
          throw new AppError('LM Studio response is not valid JSON object', {
            code: 'LM_STUDIO_INVALID_JSON',
            status: 422,
            details: { contentPreview: String(content || '').slice(0, 300) },
          });
        }

        return parsed;
      } catch (error) {
        variantErrors.push({
          variant: variant.name,
          message: error?.message || 'Unknown error',
          code: error?.code || null,
          status: error?.status || null,
          details: error?.details || null,
        });

        const hasNextVariant = index < requestVariants.length - 1;
        if (!hasNextVariant) break;

        // On passe au format suivant si le serveur rejette le schéma de payload.
        const body = String(error?.details?.body || '');
        const schemaMismatch =
          error?.code === 'LM_STUDIO_HTTP_ERROR' &&
          (/input.+required/i.test(body) ||
            /messages.+required/i.test(body) ||
            /invalid_union/i.test(body) ||
            /invalid_request/i.test(body));
        if (schemaMismatch) continue;
      }
    }

    throw new AppError('LM Studio request variants failed', {
      code: 'LM_STUDIO_REQUEST_VARIANTS_FAILED',
      status: 502,
      details: { chatUrl, variantErrors },
    });
  }

  normalizeModelOutput(candidate) {
    const safeCandidate = candidate && typeof candidate === 'object' ? candidate : {};
    const rawTitle = restoreFrenchAccents(cleanTitle(safeCandidate.title, 'Annonce immobilière'));
    const rawDescription = restoreFrenchAccents(
      cleanDescription(safeCandidate.description, 'Description non renseignée')
    );
    const rooms =
      toPositiveInt(safeCandidate.nbrRooms, 0) ||
      extractRoomsHint(`${rawTitle} ${rawDescription}`, 0);
    const typeFromModel = normalizeType(safeCandidate.typeProperty, 'Home');
    const finalType = reconcileTypeProperty(
      typeFromModel,
      rooms,
      `${rawTitle} ${rawDescription}`,
      'Home'
    );

    return {
      title: rawTitle,
      description: rawDescription,
      typeProperty: finalType,
      status: normalizeStatus(safeCandidate.status, 'FOR_RENT'),
      price: toPositiveInt(safeCandidate.price, 0),
      contact: normalizeContact(safeCandidate.contact, ''),
      tags: normalizeTags(safeCandidate.tags, []),
      area: toPositiveInt(safeCandidate.area, 0),
      nbrRooms: rooms,
      nbrKitchens: toPositiveInt(safeCandidate.nbrKitchens ?? safeCandidate.nbrChickens, 0),
      nbrBathrooms: toPositiveInt(safeCandidate.nbrBathrooms, 0),
      nbrToilets: toPositiveInt(safeCandidate.nbrToilets, 0),
      nbrLivingRoom: toPositiveInt(safeCandidate.nbrLivingRoom, 0),
      location: normalizeLocation(safeCandidate.location),
    };
  }

  async normalizeRecord(record) {
    const payload = buildPromptPayload(record);

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
        return this.normalizeModelOutput(raw);
      } catch (error) {
        lastError = error;
      }
    }

    throw new AppError('LM Studio normalization failed after retries', {
      code: 'LM_STUDIO_NORMALIZATION_FAILED',
      status: 502,
      details: {
        message: lastError?.message || 'Unknown error',
        code: lastError?.code || null,
        lastErrorDetails: lastError?.details || null,
      },
    });
  }
}

module.exports = { LmStudioTextNormalizerAdapter };
