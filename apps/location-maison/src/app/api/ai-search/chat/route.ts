import { createHash } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { createLogger } from '@/lib/logger';
import { AppError } from '@/lib/errors/app-error';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { getDynamicTagNamesServer } from '@/lib/tags/dynamic-tags.server';

const logger = createLogger('api.ai-search.chat');

const DEFAULT_ALGOLIA_INDEX = 'location-maison_property-index';
const DEFAULT_HITS_PER_PAGE = 12;
const MAX_CREDITS_PER_CONVERSATION = 3;
const ADDITIONAL_SEARCH_CALLS_BLOCK = 3;
const LOW_RESULTS_THRESHOLD = 5;
const ALGOLIA_ANALYTICS_TAG = 'search_with_ia';

const INPUT_TOKEN_COST_PER_1K_FCFA = Number(process.env.AI_SEARCH_INPUT_TOKEN_COST_PER_1K_FCFA ?? 0);
const OUTPUT_TOKEN_COST_PER_1K_FCFA = Number(process.env.AI_SEARCH_OUTPUT_TOKEN_COST_PER_1K_FCFA ?? 0);
const SEARCH_CALL_COST_FCFA = Number(process.env.AI_SEARCH_SEARCH_CALL_COST_FCFA ?? 0);
const CREDIT_REFERENCE_VALUE_FCFA = Number(process.env.AI_SEARCH_CREDIT_REFERENCE_FCFA ?? 250);

const searchFilterSchema = z.object({
  query: z.string().trim().max(160).optional(),
  province: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  street: z.string().trim().max(120).optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  minNbrRooms: z.number().int().nonnegative().optional(),
  maxNbrRooms: z.number().int().nonnegative().optional(),
  typeProperty: z.array(z.string().trim().min(1).max(40)).max(6).optional(),
  status: z.array(z.enum(['FOR_RENT', 'FOR_SALE'])).max(2).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
});

const bodySchema = z.object({
  conversationId: z.string().trim().min(8).max(120),
  message: z.string().trim().min(2).max(1000),
  currentFilters: searchFilterSchema.optional(),
  forceSearch: z.boolean().optional(),
  entrypointSource: z.enum(['search_cta', 'direct', 'other']).optional(),
});

type SearchFilters = z.infer<typeof searchFilterSchema>;

type SuggestedAction = {
  type: 'APPLY_FILTERS';
  label: string;
  payload: Partial<SearchFilters>;
  reason: string;
};

type AlgoliaHit = {
  objectID: string;
  title?: string;
  city?: string;
  province?: string;
  street?: string;
  price?: number;
  nbrRooms?: number;
  typeProperty?: string;
  status?: string;
  tags?: string[];
  [key: string]: unknown;
};

type ConversationSession = {
  searchCallsTotal: number;
  creditsDebitedTotal: number;
};

type ExactIntentSummary = {
  locationHint: string | null;
  exactMatchesCount: number;
  hasStrictIntent: boolean;
};

type ExpandIntentSummary = {
  applied: boolean;
  previousMaxPrice: number | null;
  nextMaxPrice: number | null;
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanNumber(raw: string): number | null {
  const sanitized = raw.replace(/[^\d]/g, '');
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueStrings(values: string[] | undefined): string[] {
  if (!values?.length) return [];
  return Array.from(new Set(values.filter(Boolean)));
}

function mergeFilters(current: SearchFilters | undefined, next: Partial<SearchFilters>): SearchFilters {
  const merged: SearchFilters = {
    ...(current ?? {}),
    ...next,
  };

  merged.typeProperty = uniqueStrings([...(current?.typeProperty ?? []), ...(next.typeProperty ?? [])]);
  merged.status = uniqueStrings([...(current?.status ?? []), ...(next.status ?? [])]) as SearchFilters['status'];
  merged.tags = uniqueStrings([...(current?.tags ?? []), ...(next.tags ?? [])]);

  return merged;
}

function parseCriteriaFromMessage(message: string, availableTagNames: string[]): Partial<SearchFilters> {
  const normalized = normalizeText(message);
  const parsed: Partial<SearchFilters> = {};

  const roomMatch = normalized.match(/(\d+)\s*(?:chambre|chambres|piece|pieces)/);
  if (roomMatch?.[1]) {
    const rooms = Number(roomMatch[1]);
    if (Number.isFinite(rooms) && rooms > 0) {
      parsed.minNbrRooms = rooms;
      parsed.maxNbrRooms = rooms;
    }
  }

  const betweenPrice = normalized.match(
    /entre\s+(\d[\d\s.,]*)\s*(?:et|a|à|-)\s*(\d[\d\s.,]*)\s*(?:fcfa|f cfa|xaf)?/
  );
  if (betweenPrice?.[1] && betweenPrice?.[2]) {
    const min = cleanNumber(betweenPrice[1]);
    const max = cleanNumber(betweenPrice[2]);
    if (min !== null && max !== null) {
      parsed.minPrice = Math.min(min, max);
      parsed.maxPrice = Math.max(min, max);
    }
  } else {
    const budgetMaxMatch = normalized.match(
      /(?:max(?:imum)?|jusqu(?:e|')?\s*a|a|à)\s*(\d[\d\s.,]*)\s*(?:fcfa|f cfa|xaf)?/
    );
    if (budgetMaxMatch?.[1]) {
      const max = cleanNumber(budgetMaxMatch[1]);
      if (max !== null) {
        parsed.maxPrice = max;
      }
    }
  }

  if (normalized.includes('louer') || normalized.includes('location')) {
    parsed.status = ['FOR_RENT'];
  }
  if (normalized.includes('vendre') || normalized.includes('vente')) {
    parsed.status = ['FOR_SALE'];
  }

  const typeMappings: Array<{ key: string; patterns: RegExp[] }> = [
    { key: 'Home', patterns: [/\bmaison\b/, /\blogement\b/] },
    { key: 'Apartment', patterns: [/\bappartement\b/] },
    { key: 'Studio', patterns: [/\bstudio\b/] },
    { key: 'Villa', patterns: [/\bvilla\b/] },
    { key: 'Room', patterns: [/\bchambre\b/] },
    { key: 'Land', patterns: [/\bterrain\b/] },
    { key: 'Desk', patterns: [/\bbureau\b/] },
    { key: 'Shop', patterns: [/\bmagasin\b/, /\bboutique\b/] },
  ];

  const matchedTypes = typeMappings
    .filter((mapping) => mapping.patterns.some((pattern) => pattern.test(normalized)))
    .map((mapping) => mapping.key);
  if (matchedTypes.length > 0) {
    parsed.typeProperty = matchedTypes;
  }

  const matchedTags = availableTagNames
    .filter((tagName) => normalized.includes(normalizeText(tagName)));
  if (matchedTags.length > 0) {
    parsed.tags = matchedTags;
  }

  const locationMatch = normalized.match(/\b(?:a|à|en|au|aux)\s+([a-z][a-z0-9\-]*(?:\s+[a-z0-9\-]+){0,3})/);
  if (locationMatch?.[1]) {
    const candidate = locationMatch[1].trim().replace(/\s+/g, ' ');
    const isNonLocationKeyword = ['louer', 'location', 'vente', 'vendre', 'prix', 'budget'].includes(candidate);
    const includesNonLocationToken = [
      'chambre',
      'chambres',
      'piece',
      'pieces',
      'maison',
      'appartement',
      'studio',
      'villa',
      'terrain',
      'fcfa',
      'xaf',
    ].some((token) => candidate.includes(token));
    if (!isNonLocationKeyword && !includesNonLocationToken) {
      parsed.query = candidate.slice(0, 80);
    }
  }

  return parsed;
}

function hasStructuredCriteria(filters: Partial<SearchFilters>): boolean {
  return (
    typeof filters.minPrice === 'number' ||
    typeof filters.maxPrice === 'number' ||
    typeof filters.minNbrRooms === 'number' ||
    typeof filters.maxNbrRooms === 'number' ||
    Boolean(filters.province) ||
    Boolean(filters.city) ||
    Boolean(filters.street) ||
    (filters.typeProperty?.length ?? 0) > 0 ||
    (filters.tags?.length ?? 0) > 0 ||
    (filters.status?.length ?? 0) > 0
  );
}

function isNewSearchRequestMessage(message: string): boolean {
  const normalized = normalizeText(message);
  const newSearchMarkers = [
    'je cherche',
    'je veux',
    'recherche',
    'cherche',
    'trouve moi',
    'trouve-moi',
    'je voudrais',
    'montre moi',
    'montre-moi',
  ];
  const followUpMarkers = [
    'elargis',
    'elargir',
    'continue',
    'ok',
    'vas y',
    'vas-y',
    'go',
    'relance',
  ];

  const hasNewSearchMarker = newSearchMarkers.some((marker) => normalized.includes(marker));
  const hasFollowUpMarker = followUpMarkers.some((marker) => normalized.includes(marker));
  return hasNewSearchMarker && !hasFollowUpMarker;
}

function isGreetingOnlyMessage(message: string): boolean {
  const normalized = normalizeText(message).replace(/[!?.,;:()]/g, ' ').trim();
  if (!normalized) return false;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  const greetings = new Set([
    'bonjour',
    'bonsoir',
    'salut',
    'hello',
    'hi',
    'coucou',
    'slt',
    'yo',
    'bjr',
  ]);

  return tokens.every((token) => greetings.has(token));
}

function shouldRunSearch(
  message: string,
  currentFilters: SearchFilters,
  criteriaFromCurrentMessage: Partial<SearchFilters>,
  forceSearch = false
): boolean {
  if (forceSearch) return true;
  if (isGreetingOnlyMessage(message)) return false;

  const normalized = normalizeText(message);
  const hasFilterIntent = hasStructuredCriteria(criteriaFromCurrentMessage);
  const hasCurrentCriteria = hasStructuredCriteria(currentFilters);

  const searchKeywords = [
    'cherche',
    'recherche',
    'trouve',
    'trouver',
    'montre',
    'montrez',
    'propose',
    'maison',
    'appartement',
    'studio',
    'villa',
    'terrain',
    'prix',
    'budget',
    'chambre',
    'logement',
    'louer',
    'vente',
  ];

  if (hasFilterIntent || searchKeywords.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  if (hasCurrentCriteria) {
    const followUpKeywords = [
      'ok',
      'okay',
      'oui',
      'continue',
      'elargis',
      'elargir',
      'elargissez',
      'elargi',
      'assouplis',
      'assouplir',
      'etends',
      'etendre',
      'plus large',
      'vas y',
      'vas-y',
      'go',
      'lance',
      'demarre',
      'démarre',
      'montre moi',
      'montre-moi',
      'propose moi',
      'propose-moi',
    ];
    return followUpKeywords.some((keyword) => normalized.includes(keyword));
  }

  return false;
}

function applyExpandIntent(message: string, filters: SearchFilters): {
  filters: SearchFilters;
  summary: ExpandIntentSummary;
} {
  const normalized = normalizeText(message);
  const expandKeywords = [
    'elargis',
    'elargir',
    'elargissez',
    'elargi',
    'assouplis',
    'assouplir',
    'etends',
    'etendre',
    'plus large',
    'ouvre un peu',
  ];
  const shouldExpand = expandKeywords.some((keyword) => normalized.includes(keyword));
  const hasBudget = typeof filters.maxPrice === 'number' && filters.maxPrice > 0;

  if (!shouldExpand || !hasBudget) {
    return {
      filters,
      summary: {
        applied: false,
        previousMaxPrice: hasBudget ? filters.maxPrice ?? null : null,
        nextMaxPrice: hasBudget ? filters.maxPrice ?? null : null,
      },
    };
  }

  const nextMaxPrice = Math.round((filters.maxPrice as number) * 1.1);
  return {
    filters: {
      ...filters,
      maxPrice: nextMaxPrice,
    },
    summary: {
      applied: true,
      previousMaxPrice: filters.maxPrice ?? null,
      nextMaxPrice,
    },
  };
}

function buildSearchQuery(params: {
  message: string;
  mergedFilters: SearchFilters;
}): string {
  const explicitQuery = (params.mergedFilters.query ?? '').trim();
  const hasStructuredFilters = hasStructuredCriteria(params.mergedFilters);

  // Quand les filtres structurés sont présents, on évite les longues phrases
  // conversationnelles comme query Algolia pour ne pas étouffer les résultats.
  if (hasStructuredFilters) {
    return explicitQuery.slice(0, 160);
  }

  return params.message.slice(0, 160);
}

function normalizeNullable(value: unknown): string {
  return normalizeText(String(value ?? ''));
}

function buildExactIntentSummary(
  message: string,
  filters: SearchFilters,
  hits: AlgoliaHit[]
): ExactIntentSummary {
  const locationHint = filters.query?.trim() ? filters.query.trim() : null;
  const hasRoomExactIntent =
    typeof filters.minNbrRooms === 'number' &&
    typeof filters.maxNbrRooms === 'number' &&
    filters.minNbrRooms === filters.maxNbrRooms;
  const hasStrictIntent = Boolean(locationHint) || hasRoomExactIntent || typeof filters.maxPrice === 'number';

  if (!hasStrictIntent || hits.length === 0) {
    return {
      locationHint,
      exactMatchesCount: 0,
      hasStrictIntent,
    };
  }

  const exactMatchesCount = hits.filter((hit) => {
    const matchesLocation = locationHint
      ? normalizeNullable(`${hit.title ?? ''} ${hit.street ?? ''} ${hit.city ?? ''} ${hit.province ?? ''}`).includes(
          normalizeNullable(locationHint)
        )
      : true;

    const matchesPrice =
      typeof filters.maxPrice === 'number'
        ? typeof hit.price === 'number' && hit.price <= filters.maxPrice
        : true;

    const matchesRooms = hasRoomExactIntent
      ? typeof hit.nbrRooms === 'number' && hit.nbrRooms === filters.minNbrRooms
      : true;

    return matchesLocation && matchesPrice && matchesRooms;
  }).length;

  return {
    locationHint,
    exactMatchesCount,
    hasStrictIntent,
  };
}

function escapeForAlgoliaFilter(value: string): string {
  return value.replace(/"/g, '\\"').trim();
}

function buildAlgoliaFilters(filters: SearchFilters): string {
  const clauses: string[] = ['state:"IN_PROGRESS"', 'moderationStatus:"APPROVED"'];

  if (filters.province) clauses.push(`province:"${escapeForAlgoliaFilter(filters.province)}"`);
  if (filters.city) clauses.push(`city:"${escapeForAlgoliaFilter(filters.city)}"`);
  if (filters.street) clauses.push(`street:"${escapeForAlgoliaFilter(filters.street)}"`);
  if (typeof filters.minPrice === 'number') clauses.push(`price >= ${filters.minPrice}`);
  if (typeof filters.maxPrice === 'number') clauses.push(`price <= ${filters.maxPrice}`);
  if (typeof filters.minNbrRooms === 'number') clauses.push(`nbrRooms >= ${filters.minNbrRooms}`);
  if (typeof filters.maxNbrRooms === 'number') clauses.push(`nbrRooms <= ${filters.maxNbrRooms}`);

  if (filters.typeProperty?.length) {
    const formatted = filters.typeProperty
      .map((value) => `typeProperty:"${escapeForAlgoliaFilter(value)}"`)
      .join(' OR ');
    clauses.push(`(${formatted})`);
  }

  if (filters.status?.length) {
    const formatted = filters.status
      .map((value) => `status:"${escapeForAlgoliaFilter(value)}"`)
      .join(' OR ');
    clauses.push(`(${formatted})`);
  }

  if (filters.tags?.length) {
    const formatted = filters.tags
      .map((value) => `tags:"${escapeForAlgoliaFilter(value)}"`)
      .join(' OR ');
    clauses.push(`(${formatted})`);
  }

  return clauses.join(' AND ');
}

function computeCreditsToDebit(
  previousSearchCalls: number,
  previousCreditsDebited: number,
  searchCallsDelta: number
): number {
  if (searchCallsDelta <= 0) return 0;

  const nextSearchCalls = previousSearchCalls + searchCallsDelta;
  let toDebit = 0;

  if (previousSearchCalls === 0) {
    toDebit += 1;
  }

  const beforeBlocks = Math.floor(Math.max(previousSearchCalls - 1, 0) / ADDITIONAL_SEARCH_CALLS_BLOCK);
  const afterBlocks = Math.floor(Math.max(nextSearchCalls - 1, 0) / ADDITIONAL_SEARCH_CALLS_BLOCK);
  toDebit += Math.max(0, afterBlocks - beforeBlocks);

  const remainingConversationCap = Math.max(0, MAX_CREDITS_PER_CONVERSATION - previousCreditsDebited);
  return Math.min(toDebit, remainingConversationCap);
}

function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function estimateCosts(inputTokens: number, outputTokens: number, searchCallsDelta: number) {
  const inputCost = (inputTokens / 1000) * INPUT_TOKEN_COST_PER_1K_FCFA;
  const outputCost = (outputTokens / 1000) * OUTPUT_TOKEN_COST_PER_1K_FCFA;
  const searchCost = searchCallsDelta * SEARCH_CALL_COST_FCFA;
  return Number((inputCost + outputCost + searchCost).toFixed(2));
}

function computeResultStatus(nbHits: number): 'none' | 'few' | 'enough' {
  if (nbHits <= 0) return 'none';
  if (nbHits < LOW_RESULTS_THRESHOLD) return 'few';
  return 'enough';
}

function buildSuggestedActions(filters: SearchFilters, nbHits: number): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const maxPrice = filters.maxPrice ?? null;

  if (nbHits === 0) {
    if (maxPrice && maxPrice > 0) {
      actions.push({
        type: 'APPLY_FILTERS',
        label: `Tester budget ${Math.round(maxPrice * 1.15).toLocaleString()} FCFA`,
        payload: { maxPrice: Math.round(maxPrice * 1.15) },
        reason: 'Elargir légèrement le budget peut débloquer plus d’options.',
      });
    }
    if ((filters.minNbrRooms ?? 0) >= 2) {
      const relaxedRooms = Math.max(1, (filters.minNbrRooms ?? 2) - 1);
      actions.push({
        type: 'APPLY_FILTERS',
        label: `Essayer ${relaxedRooms} chambre${relaxedRooms > 1 ? 's' : ''}`,
        payload: { minNbrRooms: relaxedRooms, maxNbrRooms: relaxedRooms },
        reason: 'Réduire le nombre de chambres peut ouvrir plus de résultats.',
      });
    }
  }

  if (nbHits > 0 && nbHits < LOW_RESULTS_THRESHOLD && maxPrice && maxPrice > 0) {
    actions.push({
      type: 'APPLY_FILTERS',
      label: `Elargir à ${Math.round(maxPrice * 1.1).toLocaleString()} FCFA`,
      payload: { maxPrice: Math.round(maxPrice * 1.1) },
      reason: 'Un petit élargissement de budget peut augmenter les choix disponibles.',
    });
  }

  return actions.slice(0, 3);
}

function containsUnsafeLanguage(text: string): boolean {
  const unsafeTerms = ['connard', 'con', 'imbecile', 'idiot', 'pute', 'encule', 'salope'];
  const normalized = normalizeText(text);
  return unsafeTerms.some((term) => normalized.includes(term));
}

function isOutOfScopeRequest(message: string): boolean {
  const normalized = normalizeText(message);
  const outOfScopeKeywords = [
    'pirat',
    'hack',
    'politique',
    'religion',
    'insulte',
    'injure',
    'arnaque',
    'escroquerie',
    'violence',
  ];

  return outOfScopeKeywords.some((keyword) => normalized.includes(keyword));
}

async function generateWithGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || null;
  } catch (error) {
    logger.warn('Gemini generation failed, fallback to deterministic response', { error });
    return null;
  }
}

function deterministicAssistantReply(
  message: string,
  nbHits: number,
  filters: SearchFilters,
  searchWasRun: boolean,
  isOutOfScope = false,
  exactIntentSummary?: ExactIntentSummary,
  expandIntentSummary?: ExpandIntentSummary
): string {
  if (isOutOfScope) {
    return "Je peux uniquement vous aider pour la recherche de logements (budget, zone, type, chambres, tags). Donnez-moi vos critères immobiliers et je vous guide.";
  }

  if (!searchWasRun) {
    return "Je peux vous aider à trouver un logement. Donnez-moi un budget, une zone, un type de bien, et le nombre de chambres.";
  }

  const location = [filters.city, filters.province].filter(Boolean).join(', ');
  const locationPart = location ? ` dans ${location}` : '';
  const locationHint = exactIntentSummary?.locationHint;
  const hasNoExactButAlternatives =
    Boolean(locationHint) && nbHits > 0 && (exactIntentSummary?.exactMatchesCount ?? 0) === 0;

  if (nbHits === 0) {
    if (expandIntentSummary?.applied && expandIntentSummary.nextMaxPrice) {
      return `J'ai élargi le budget max à ${expandIntentSummary.nextMaxPrice.toLocaleString()} FCFA, mais aucun logement n'a encore été trouvé avec ces critères. Je peux élargir davantage ou assouplir la zone.`;
    }
    return `Aucun logement trouvé${locationPart} avec ces critères pour le moment. Je peux vous proposer des alternatives de budget, de zone ou de type de bien.`;
  }

  if (hasNoExactButAlternatives) {
    return `Je n'ai trouvé aucun logement correspondant exactement à "${locationHint}" avec vos critères. En revanche, je vous propose ${nbHits} alternative${nbHits > 1 ? 's' : ''} proche${nbHits > 1 ? 's' : ''} (même budget/chambres) pour avancer.`;
  }

  if (expandIntentSummary?.applied && expandIntentSummary.nextMaxPrice) {
    return `J'ai élargi le budget max de ${expandIntentSummary.previousMaxPrice?.toLocaleString() ?? 0} à ${expandIntentSummary.nextMaxPrice.toLocaleString()} FCFA. J'ai trouvé ${nbHits} logement${nbHits > 1 ? 's' : ''}; on peut encore ajuster si vous voulez plus de choix.`;
  }

  if (nbHits < LOW_RESULTS_THRESHOLD) {
    return `J'ai trouvé ${nbHits} logement${nbHits > 1 ? 's' : ''}${locationPart}. Les résultats sont limités; on peut élargir légèrement les critères pour avoir plus de choix.`;
  }

  return `Bonne nouvelle: ${nbHits} logements correspondent à votre recherche${locationPart}. Je peux vous aider à affiner encore pour trouver les plus pertinents.`;
}

async function buildAssistantReply(params: {
  message: string;
  searchWasRun: boolean;
  nbHits: number;
  filters: SearchFilters;
  topHits: AlgoliaHit[];
  isOutOfScope?: boolean;
  exactIntentSummary?: ExactIntentSummary;
  expandIntentSummary?: ExpandIntentSummary;
}): Promise<string> {
  const fallback = deterministicAssistantReply(
    params.message,
    params.nbHits,
    params.filters,
    params.searchWasRun,
    params.isOutOfScope ?? false,
    params.exactIntentSummary,
    params.expandIntentSummary
  );

  if (!params.searchWasRun || params.isOutOfScope) {
    return fallback;
  }

  const needsExplicitNoExactMessage =
    Boolean(params.exactIntentSummary?.locationHint) &&
    params.nbHits > 0 &&
    (params.exactIntentSummary?.exactMatchesCount ?? 0) === 0;

  if (needsExplicitNoExactMessage) {
    return fallback;
  }

  const summaryHits = params.topHits
    .slice(0, 3)
    .map((hit) => `${hit.title ?? 'Annonce'} (${hit.price ?? 'n/a'} FCFA, ${hit.city ?? 'zone inconnue'})`)
    .join(' | ');

  const prompt = [
    'Tu es un assistant de recherche immobilière au Gabon.',
    'Reste strictement dans le périmètre recherche logement.',
    'Interdits: insultes, agressivité, contenu haineux, hors sujet.',
    `Message utilisateur: ${params.message}`,
    `Nombre de résultats: ${params.nbHits}`,
    `Résultats exacts selon critères stricts: ${params.exactIntentSummary?.exactMatchesCount ?? 0}`,
    `Zone demandée: ${params.exactIntentSummary?.locationHint ?? 'non spécifiée'}`,
    `Elargissement budget appliqué: ${params.expandIntentSummary?.applied ? 'oui' : 'non'}`,
    `Nouveau budget max: ${params.expandIntentSummary?.nextMaxPrice ?? 'n/a'}`,
    `Top résultats: ${summaryHits || 'aucun'}`,
    `Filtres actifs: ${JSON.stringify(params.filters)}`,
    'Réponds en français, en 2-3 phrases maximum, ton professionnel et concret.',
    'Si aucune annonce exacte n’existe dans la zone demandée, dis-le explicitement avant de proposer des alternatives.',
  ].join('\n');

  const generated = await generateWithGemini(prompt);
  if (!generated || containsUnsafeLanguage(generated)) {
    return fallback;
  }

  return generated.slice(0, 700);
}

async function runAlgoliaSearch(
  query: string,
  filters: string,
  uid: string,
  entrypointSource: 'search_cta' | 'direct' | 'other'
): Promise<{ hits: AlgoliaHit[]; nbHits: number; queryId: string | null; indexName: string }> {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  const indexName = process.env.ALGOLIA_INDEX_NAME ?? DEFAULT_ALGOLIA_INDEX;

  if (!appId || !apiKey) {
    throw new AppError("La configuration Algolia est incomplète sur le serveur.", {
      code: 'ALGOLIA_CONFIGURATION_ERROR',
      status: 500,
    });
  }

  const response = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-Application-Id': appId,
      'X-Algolia-API-Key': apiKey,
    },
    body: JSON.stringify({
      query,
      filters,
      hitsPerPage: DEFAULT_HITS_PER_PAGE,
      analytics: true,
      clickAnalytics: true,
      analyticsTags: [ALGOLIA_ANALYTICS_TAG, `entry:${entrypointSource}`],
      userToken: uid,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    logger.error('Algolia query failed', {
      status: response.status,
      payload,
    });
    throw new AppError("Le moteur de recherche est temporairement indisponible.", {
      code: 'ALGOLIA_SEARCH_FAILED',
      status: 502,
    });
  }

  const data = (await response.json()) as { hits?: AlgoliaHit[]; nbHits?: number; queryID?: string };
  return {
    hits: Array.isArray(data.hits) ? data.hits : [],
    nbHits: typeof data.nbHits === 'number' ? data.nbHits : 0,
    queryId: typeof data.queryID === 'string' ? data.queryID : null,
    indexName,
  };
}

function buildSearchAnalyticsQueryParams(
  query: string,
  filters: SearchFilters,
  entrypointSource: 'search_cta' | 'direct' | 'other' | undefined
): Record<string, string | number | boolean | string[]> {
  const params: Record<string, string | number | boolean | string[]> = {
    query,
    entrypointSource: entrypointSource ?? 'other',
  };

  if (filters.province) params.province = filters.province;
  if (filters.city) params.city = filters.city;
  if (filters.street) params.street = filters.street;
  if (typeof filters.minPrice === 'number') params.minPrice = filters.minPrice;
  if (typeof filters.maxPrice === 'number') params.maxPrice = filters.maxPrice;
  if (typeof filters.minNbrRooms === 'number') params.minNbrRooms = filters.minNbrRooms;
  if (typeof filters.maxNbrRooms === 'number') params.maxNbrRooms = filters.maxNbrRooms;
  if (filters.typeProperty?.length) params.typeProperty = filters.typeProperty;
  if (filters.status?.length) params.status = filters.status;
  if (filters.tags?.length) params.tags = filters.tags;

  return params;
}

async function emitSearchWithIAAnalytics(params: {
  request: NextRequest;
  uid: string;
  conversationId: string;
  query: string;
  filters: SearchFilters;
  entrypointSource: 'search_cta' | 'direct' | 'other' | undefined;
  nbHits: number;
}) {
  const nowIso = new Date().toISOString();
  const payload = {
    sent_at: nowIso,
    occurred_at: nowIso,
    actor: {
      actor_type: 'user' as const,
      actor_id: params.uid,
      is_authenticated: true,
    },
    session: {
      session_id: params.conversationId,
    },
    search: {
      source: 'search_with_ia_page' as const,
      query_text_raw: params.query.slice(0, 160),
      query_params: buildSearchAnalyticsQueryParams(
        params.query,
        params.filters,
        params.entrypointSource
      ),
    },
    result: {
      results_count: Math.max(0, Math.trunc(params.nbHits)),
      engine: 'algolia',
    },
  };

  const idempotencyKey = `ai_${createHash('sha256')
    .update(
      JSON.stringify({
        conversationId: params.conversationId,
        uid: params.uid,
        query: params.query,
        filters: params.filters,
        nbHits: params.nbHits,
      })
    )
    .digest('hex')
    .slice(0, 48)}`;
  const correlationId = `corr_ai_${createHash('sha256')
    .update(`${params.conversationId}:${Date.now()}:${params.uid}`)
    .digest('hex')
    .slice(0, 32)}`;

  const endpoint = new URL('/api/analytics/search', params.request.url).toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1600);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      logger.warn('Search-with-IA analytics forwarding rejected', {
        status: response.status,
        details,
      });
    }
  } catch (error) {
    const timeout = error instanceof Error && error.name === 'AbortError';
    logger.warn('Search-with-IA analytics forwarding failed', {
      timeout,
      error,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function findUserDocumentByUID(db: any, uid: string) {
  const usersSnapshot = await db.collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1).get();
  if (usersSnapshot.empty) return null;
  return usersSnapshot.docs[0];
}

function parseSessionData(raw: any): ConversationSession {
  return {
    searchCallsTotal: Number(raw?.searchCallsTotal ?? 0),
    creditsDebitedTotal: Number(raw?.creditsDebitedTotal ?? 0),
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonApiError(401, 'UNAUTHORIZED', "Token d'authentification requis.");
    }

    const token = authHeader.split('Bearer ')[1];
    const bodyValidation = bodySchema.safeParse(await request.json());
    if (!bodyValidation.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Données de requête invalides.', {
        issues: bodyValidation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const body = bodyValidation.data;

    const [{ adminAuth, adminApp }, { getFirestore, FieldValue }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ]);

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const db = getFirestore(adminApp as any);

    const userDoc = await findUserDocumentByUID(db, uid);
    if (!userDoc) {
      return jsonApiError(404, 'USER_NOT_FOUND', "Profil utilisateur introuvable.");
    }

    const currentFilters = body.currentFilters ?? {};
    const availableTagNames = await getDynamicTagNamesServer();
    const parsedFilters = parseCriteriaFromMessage(body.message, availableTagNames);
    const shouldResetContext = isNewSearchRequestMessage(body.message);
    const mergedFilters = shouldResetContext
      ? (parsedFilters as SearchFilters)
      : mergeFilters(currentFilters, parsedFilters);
    const expandIntentResult = applyExpandIntent(body.message, mergedFilters);
    const effectiveFilters = expandIntentResult.filters;
    const outOfScope = isOutOfScopeRequest(body.message);
    const searchWillRun =
      !outOfScope &&
      shouldRunSearch(body.message, currentFilters, parsedFilters, body.forceSearch ?? false);
    const searchCallsDelta = searchWillRun ? 1 : 0;

    const sessionRef = db.collection(firebaseCollectionNames.ai_search_sessions).doc(body.conversationId);
    const sessionSnapshot = await sessionRef.get();
    const currentSession = parseSessionData(sessionSnapshot.exists ? sessionSnapshot.data() : null);

    const currentCredits = Number(userDoc.data()?.credits ?? 0);
    const previewDebit = computeCreditsToDebit(
      currentSession.searchCallsTotal,
      currentSession.creditsDebitedTotal,
      searchCallsDelta
    );

    if (previewDebit > currentCredits) {
      return jsonApiError(
        402,
        'INSUFFICIENT_CREDITS',
        "Crédits insuffisants pour lancer la recherche IA. Rechargez votre compte."
      );
    }

    let hits: AlgoliaHit[] = [];
    let nbHits = 0;
    let queryId: string | null = null;
    let indexName = process.env.ALGOLIA_INDEX_NAME ?? DEFAULT_ALGOLIA_INDEX;
    const query = buildSearchQuery({
      message: body.message,
      mergedFilters: effectiveFilters,
    });
    const filtersExpression = buildAlgoliaFilters(effectiveFilters);

    if (searchWillRun) {
      const searchResponse = await runAlgoliaSearch(
        query,
        filtersExpression,
        uid,
        body.entrypointSource ?? 'other'
      );
      hits = searchResponse.hits;
      nbHits = searchResponse.nbHits;
      queryId = searchResponse.queryId;
      indexName = searchResponse.indexName;
    }

    const exactIntentSummary = buildExactIntentSummary(body.message, effectiveFilters, hits);

    const assistantMessage = await buildAssistantReply({
      message: body.message,
      searchWasRun: searchWillRun,
      nbHits,
      filters: effectiveFilters,
      topHits: hits,
      isOutOfScope: outOfScope,
      exactIntentSummary,
      expandIntentSummary: expandIntentResult.summary,
    });
    const suggestedActions = buildSuggestedActions(effectiveFilters, nbHits);

    let creditsDebited = 0;
    let creditsRemaining = currentCredits;
    let creditsDebitedTotal = currentSession.creditsDebitedTotal;
    let searchCallsTotal = currentSession.searchCallsTotal;
    let creditTransactionId: string | null = null;

    await db.runTransaction(async (transaction: any) => {
      const freshUserSnap = await transaction.get(userDoc.ref);
      const freshSessionSnap = await transaction.get(sessionRef);

      const freshUserCredits = Number(freshUserSnap.data()?.credits ?? 0);
      const freshSession = parseSessionData(freshSessionSnap.exists ? freshSessionSnap.data() : null);
      const freshDebit = computeCreditsToDebit(
        freshSession.searchCallsTotal,
        freshSession.creditsDebitedTotal,
        searchCallsDelta
      );

      if (freshDebit > freshUserCredits) {
        throw new AppError("Crédits insuffisants pour lancer la recherche IA.", {
          code: 'INSUFFICIENT_CREDITS',
          status: 402,
        });
      }

      const nextSearchCalls = freshSession.searchCallsTotal + searchCallsDelta;
      const nextCreditsDebitedTotal = freshSession.creditsDebitedTotal + freshDebit;
      const nextCredits = freshUserCredits - freshDebit;

      if (freshDebit > 0) {
        transaction.update(userDoc.ref, {
          credits: nextCredits,
          updatedAt: FieldValue.serverTimestamp(),
        });

        const creditTxRef = db.collection(firebaseCollectionNames.credit_transactions).doc();
        creditTransactionId = creditTxRef.id;
        transaction.set(creditTxRef, {
          uid,
          credits: -Math.abs(freshDebit),
          type: 'spend',
          status: 'success',
          service: 'Assistant IA Recherche',
          description: `Assistant IA Recherche - ${body.message.slice(0, 60)}${body.message.length > 60 ? '...' : ''}`,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.set(
        sessionRef,
        {
          uid,
          conversationId: body.conversationId,
          searchCallsTotal: nextSearchCalls,
          creditsDebitedTotal: nextCreditsDebitedTotal,
          lastMessage: body.message.slice(0, 200),
          lastMessageAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: freshSessionSnap.exists
            ? freshSessionSnap.data()?.createdAt ?? FieldValue.serverTimestamp()
            : FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      creditsDebited = freshDebit;
      creditsRemaining = nextCredits;
      creditsDebitedTotal = nextCreditsDebitedTotal;
      searchCallsTotal = nextSearchCalls;
    });

    const inputTokens = estimateTokens(`${body.message}\n${JSON.stringify(mergedFilters)}`);
    const outputTokens = estimateTokens(assistantMessage);
    const costEstimatedFcfa = estimateCosts(inputTokens, outputTokens, searchCallsDelta);
    const revenueEstimatedFcfa = Number((creditsDebited * CREDIT_REFERENCE_VALUE_FCFA).toFixed(2));
    const marginRate =
      revenueEstimatedFcfa > 0
        ? Number(((revenueEstimatedFcfa - costEstimatedFcfa) / revenueEstimatedFcfa).toFixed(4))
        : 0;
    const resultStatus = computeResultStatus(nbHits);

    await db.collection(firebaseCollectionNames.ai_search_turns).add({
      uid,
      conversationId: body.conversationId,
      entrypointSource: body.entrypointSource ?? 'other',
      message: body.message,
      searchQuery: searchWillRun ? query : null,
      searchFilters: searchWillRun ? filtersExpression : null,
      searchQueryId: searchWillRun ? queryId : null,
      searchIndexName: searchWillRun ? indexName : null,
      searchCallsDelta,
      searchCallsTotal,
      nbHits,
      resultStatus,
      inputTokens,
      outputTokens,
      creditsDebited,
      creditsDebitedTotal,
      creditsRemaining,
      costEstimatedFcfa,
      revenueEstimatedFcfa,
      marginRate,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (searchWillRun) {
      await emitSearchWithIAAnalytics({
        request,
        uid,
        conversationId: body.conversationId,
        query,
        filters: effectiveFilters,
        entrypointSource: body.entrypointSource,
        nbHits,
      });
    }

    return NextResponse.json({
      success: true,
      conversationId: body.conversationId,
      assistantMessage,
      suggestedActions,
      search: {
        ran: searchWillRun,
        query: searchWillRun ? query : null,
        filters: searchWillRun ? filtersExpression : null,
        queryId: searchWillRun ? queryId : null,
        indexName: searchWillRun ? indexName : null,
        appliedFilters: effectiveFilters,
        nbHits,
        hits,
        resultStatus,
      },
      usage: {
        searchCallsDelta,
        searchCallsTotal,
        inputTokens,
        outputTokens,
      },
      billing: {
        creditsDebited,
        creditsRemaining,
        creditsDebitedTotal,
        transactionId: creditTransactionId,
      },
      finance: {
        costEstimatedFcfa,
        revenueEstimatedFcfa,
        marginRate,
      },
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/ai-search/chat',
      fallbackMessage: "Erreur lors de la recherche assistée par IA",
      knownCodes: {
        'auth/id-token-expired': {
          status: 401,
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Session expirée. Veuillez vous reconnecter.',
        },
        'auth/invalid-id-token': {
          status: 401,
          code: 'AUTH_TOKEN_INVALID',
          message: "Token d'authentification invalide.",
        },
      },
    });
  }
}
