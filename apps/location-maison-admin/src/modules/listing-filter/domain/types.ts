import type {
  ListingStatus,
  ListingTypeProperty,
} from "@/modules/account-provisioning/domain/types";

/**
 * Forme (partielle) d'un post tel que produit par l'acteur Apify
 * « Facebook Posts/Groups Scraper ». On ne contraint que les champs
 * exploités par le filtre ; le reste du post est conservé tel quel.
 */
export type ApifyFacebookPost = {
  facebookUrl?: string;
  text?: string;
  attachments?: unknown[];
  user?: {
    id?: string;
    name?: string;
  };
  likesCount?: number;
  commentsCount?: number;
  [key: string]: unknown;
};

/**
 * Raisons normalisées de rejet d'un post (non-logement).
 */
export type ListingRejectionReason =
  | "EMPTY_TEXT"
  | "NO_PROPERTY_SIGNAL"
  | "NON_HOUSING_TOPIC";

/**
 * Résultat de classification d'un post unique.
 */
export type ListingClassification = {
  isListing: boolean;
  typeProperty: ListingTypeProperty | null;
  status: ListingStatus | null;
  /** Score de confiance heuristique entre 0 et 1. */
  score: number;
  /** Libellés des signaux détectés (debug / explicabilité). */
  matchedSignals: string[];
  rejectionReason: ListingRejectionReason | null;
};

/**
 * Post conservé, enrichi de sa classification.
 */
export type ListingFilterKeptPost = {
  index: number;
  post: ApifyFacebookPost;
  classification: ListingClassification;
};

/**
 * Post rejeté (résumé léger pour diagnostic).
 */
export type ListingFilterRejectedPost = {
  index: number;
  reason: ListingRejectionReason;
  userName: string | null;
  textPreview: string;
};

export type ListingFilterStats = {
  total: number;
  kept: number;
  rejected: number;
  byType: Partial<Record<ListingTypeProperty, number>>;
  byRejectionReason: Partial<Record<ListingRejectionReason, number>>;
};

export type FilterListingsOptions = {
  /**
   * Si vrai, ajoute un champ `_classification` à chaque post conservé.
   * Sinon les posts sont renvoyés à l'identique (réutilisables tels quels
   * par le pipeline social-import). Défaut: false.
   */
  annotate?: boolean;
};

export type FilterListingsResult = {
  /** Posts identifiés comme annonces de logement (JSON filtré). */
  listings: ApifyFacebookPost[];
  /** Détail des posts conservés (avec classification). */
  kept: ListingFilterKeptPost[];
  /** Détail des posts écartés. */
  rejected: ListingFilterRejectedPost[];
  stats: ListingFilterStats;
};
