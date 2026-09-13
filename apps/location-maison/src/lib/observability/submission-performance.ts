import { createLogger } from '@/lib/logger';

/**
 * Instrumentation légère des parcours de création/modification (annonces + réels) — voir
 * docs/performance-creation-modification-annonces-reels.md, point 8. Précède les
 * optimisations fonctionnelles (points 1 à 7) dans l'ordre proposé par le document ; sert de
 * référence pour comparer chaque changement, pas seulement une impression locale.
 *
 * Contrainte centrale : cette instrumentation ne doit JAMAIS influencer le résultat d'une
 * soumission. Toute panne (transport, horloge absente, erreur interne) est absorbée sans
 * remonter à l'appelant.
 */

/** Phases normalisées communes aux annonces classiques, assistées par IA, et aux réels. */
export type SubmissionPhase =
  | 'validation'
  | 'image_prepare'
  | 'image_upload'
  | 'thumbnail'
  | 'ai'
  | 'location_sync'
  | 'property_write'
  | 'reel_create'
  | 'video_upload'
  | 'cache_invalidation'
  | 'navigation';

/**
 * Dimensions explicitement autorisées — jamais de contenu utilisateur (titre, description,
 * téléphone, UID, URL Storage, nom de fichier, adresse, coordonnées). `sanitizeDimensions`
 * retire en plus toute clé interdite qui serait passée par erreur, en défense en profondeur.
 */
export type SubmissionDimensions = Partial<{
  journeyType: 'property' | 'category_listing' | 'reel';
  mode: 'create' | 'update';
  categoryRoot: string;
  fileCount: number;
  sizeClass: 'small' | 'medium' | 'large';
  networkType: string;
}>;

export type PhaseStatus = 'success' | 'error';

export interface SubmissionPhaseRecord {
  submissionId: string;
  phase: SubmissionPhase;
  /** Distingue des phases répétées (ex. upload par image) ou imbriquées — index 0 par défaut. */
  index: number;
  durationMs: number;
  status: PhaseStatus;
  /** Code d'erreur interne uniquement (jamais un message brut susceptible de contenir du contenu utilisateur). */
  errorCode?: string;
  dimensions: Record<string, unknown>;
}

export type SubmissionTransport = (record: SubmissionPhaseRecord) => void;

export interface ClockLike {
  now(): number;
}

const logger = createLogger('observability.submission-performance');

// Jamais de contenu utilisateur dans les dimensions — voir SubmissionDimensions ci-dessus.
const FORBIDDEN_DIMENSION_KEYS = new Set([
  'description',
  'title',
  'phone',
  'phonenumber',
  'uid',
  'userid',
  'url',
  'fileurl',
  'filename',
  'address',
  'latitude',
  'longitude',
  'city',
  'province',
  'street',
  'contact',
]);

function sanitizeDimensions(dimensions: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!dimensions) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dimensions)) {
    if (FORBIDDEN_DIMENSION_KEYS.has(key.toLowerCase())) continue;
    result[key] = value;
  }
  return result;
}

function resolveDefaultClock(): ClockLike {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return { now: () => performance.now() };
  }
  // performance absent (environnement inhabituel) : horloge de repli, moins précise mais
  // suffisante pour des durées de phase à la seconde près.
  return { now: () => Date.now() };
}

function generateSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Transport par défaut : log structuré, best-effort, actif uniquement en développement pour
 * ce premier lot (voir "Mise en production progressive" — l'échantillonnage production est
 * une étape ultérieure).
 */
function defaultTransport(record: SubmissionPhaseRecord): void {
  if (process.env.NODE_ENV === 'production') return;
  logger.debug('Submission phase', { ...record });
}

export interface SubmissionPerformanceOptions {
  clock?: ClockLike;
  transport?: SubmissionTransport | null;
  dimensions?: Record<string, unknown>;
}

export class SubmissionPerformanceTracker {
  readonly submissionId: string;
  private readonly clock: ClockLike;
  private readonly transport: SubmissionTransport | null;
  private readonly baseDimensions: Record<string, unknown>;
  private readonly openPhases = new Map<string, number>();

  constructor(options: SubmissionPerformanceOptions = {}) {
    this.submissionId = generateSubmissionId();
    this.clock = options.clock ?? resolveDefaultClock();
    this.transport = options.transport === undefined ? defaultTransport : options.transport;
    this.baseDimensions = sanitizeDimensions(options.dimensions);
  }

  private key(phase: SubmissionPhase, index: number): string {
    return `${phase}:${index}`;
  }

  /** Démarre une phase (ou une occurrence d'une phase répétée, via `index`). */
  start(phase: SubmissionPhase, index = 0): void {
    try {
      this.openPhases.set(this.key(phase, index), this.clock.now());
    } catch (error) {
      logger.warn('Failed to start submission phase (ignored, never blocks the submission)', { error, phase });
    }
  }

  /**
   * Termine une phase et émet l'enregistrement correspondant — que la phase ait réussi ou
   * échoué : la fin de phase doit toujours être enregistrée, y compris après une erreur.
   */
  end(
    phase: SubmissionPhase,
    options: { index?: number; status: PhaseStatus; errorCode?: string; dimensions?: Record<string, unknown> },
  ): void {
    const index = options.index ?? 0;
    const key = this.key(phase, index);
    const startedAt = this.openPhases.get(key);
    this.openPhases.delete(key);

    const durationMs = startedAt !== undefined ? Math.max(0, this.clock.now() - startedAt) : 0;

    const record: SubmissionPhaseRecord = {
      submissionId: this.submissionId,
      phase,
      index,
      durationMs,
      status: options.status,
      errorCode: options.errorCode,
      dimensions: { ...this.baseDimensions, ...sanitizeDimensions(options.dimensions) },
    };

    this.emit(record);
  }

  /** Enchaîne start/end autour de `fn`, y compris si `fn` rejette — jamais bloquant. */
  async measure<T>(
    phase: SubmissionPhase,
    fn: () => Promise<T>,
    options: { index?: number; dimensions?: Record<string, unknown>; errorCode?: (error: unknown) => string | undefined } = {},
  ): Promise<T> {
    this.start(phase, options.index);
    try {
      const result = await fn();
      this.end(phase, { index: options.index, status: 'success', dimensions: options.dimensions });
      return result;
    } catch (error) {
      this.end(phase, {
        index: options.index,
        status: 'error',
        errorCode: options.errorCode?.(error),
        dimensions: options.dimensions,
      });
      throw error;
    }
  }

  private emit(record: SubmissionPhaseRecord): void {
    try {
      this.transport?.(record);
    } catch (error) {
      // Panne du transport (télémétrie hors ligne, refusée...) : jamais remontée, jamais
      // de retry bloquant.
      logger.warn('Submission telemetry transport failed (ignored)', { error, phase: record.phase });
    }
  }

  /** Retire les marques de phases restées ouvertes (soumission abandonnée/annulée). */
  cleanup(): void {
    this.openPhases.clear();
  }
}

/** Fabrique explicite plutôt qu'un singleton : un nouvel identifiant à chaque tentative. */
export function createSubmissionPerformanceTracker(
  options?: SubmissionPerformanceOptions,
): SubmissionPerformanceTracker {
  return new SubmissionPerformanceTracker(options);
}
