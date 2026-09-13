// Infra d'experimentation controlee pour l'empilement pub maison / AdSense
// (audit AUDIT-ADSENSE-REVENUS-2026-09.md §5.4 et §9 Lot 3).
//
// L'audit interdit de changer l'empilement actuel sans experience controlee : ce module
// fournit le mecanisme de bascule (variable d'environnement), pas la decision produit. Sans
// configuration, le comportement reste strictement identique a l'existant (A_STACK).
//
// Variantes comparees au Lot 3 :
// - A_STACK           : empilement actuel (pub maison + AdSense toujours les deux).
// - B_ALTERNATE       : alterne maison/AdSense par occurrence, via rotationIndex (feeds
//                       in-feed uniquement — search/immobilier). Sans rotationIndex fourni
//                       (emplacement unique, ex. accueil/detail annonce), retombe sur A_STACK.
// - C_RESERVED        : emplacements reserves a un seul inventaire, pilote par les listes
//                       NEXT_PUBLIC_ADS_RESERVED_HOUSE_PLACEMENTS /
//                       NEXT_PUBLIC_ADS_RESERVED_ADSENSE_PLACEMENTS (CSV de placements). Un
//                       placement absent des deux listes retombe sur A_STACK.
// - D_HOUSE_PRIORITY  : maison prioritaire si une campagne est active, AdSense seulement en
//                       fallback (jamais empile avec la maison).

export type AdStackingVariant = 'A_STACK' | 'B_ALTERNATE' | 'C_RESERVED' | 'D_HOUSE_PRIORITY';

export type AdStackingDecision = {
  showHouse: boolean;
  showAdSense: boolean;
  /** Variante effectivement appliquee (utile pour tagger les evenements analytics). */
  variant: AdStackingVariant;
};

const VALID_VARIANTS: AdStackingVariant[] = ['A_STACK', 'B_ALTERNATE', 'C_RESERVED', 'D_HOUSE_PRIORITY'];

function normalizeVariant(value: string | undefined): AdStackingVariant | null {
  const normalized = (value ?? '').trim().toUpperCase();
  return (VALID_VARIANTS as string[]).includes(normalized) ? (normalized as AdStackingVariant) : null;
}

function parsePlacementList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

export const AD_STACKING_VARIANT = normalizeVariant(process.env.NEXT_PUBLIC_ADS_STACKING_EXPERIMENT_VARIANT) ?? 'A_STACK';

const reservedHousePlacements = parsePlacementList(
  process.env.NEXT_PUBLIC_ADS_RESERVED_HOUSE_PLACEMENTS,
);
const reservedAdSensePlacements = parsePlacementList(
  process.env.NEXT_PUBLIC_ADS_RESERVED_ADSENSE_PLACEMENTS,
);

// Experience live A_STACK vs B_ALTERNATE (recommandation 2026-09-14) : identifiant stable de
// l'experience + population restreinte a search/immobilier (seules surfaces avec assez de
// volume et un rotationIndex par occurrence). Le bucket est deduit du session_id (meme session
// = meme variante toute la duree de l'experience), jamais recalcule a chaque rendu.
export const AD_STACKING_EXPERIMENT_ID = (() => {
  const raw = process.env.NEXT_PUBLIC_ADS_STACKING_EXPERIMENT_ID?.trim();
  return raw && raw.length > 0 ? raw : null;
})();

const EXPERIMENT_ELIGIBLE_PLACEMENTS = new Set(['search_infeed', 'immobilier_infeed']);

// Hash stable (djb2a + finalisation Murmur3-like) : les session_id reels partagent un prefixe
// commun ("ttn_...") suivi d'un UUID, mais un djb2 nu melange mal des entrees tres proches
// (ex. "session-0".."session-499" dans les tests) — la finalisation supplementaire evite un
// bucket 50/50 biaise sur des identifiants structures, sans besoin de resistance cryptographique.
function hashToUnitInterval(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  hash = Math.imul(hash ^ (hash >>> 15), 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0xffffffff;
}

export function resolveExperimentBucket(sessionId: string): 'A_STACK' | 'B_ALTERNATE' {
  return hashToUnitInterval(sessionId) < 0.5 ? 'A_STACK' : 'B_ALTERNATE';
}

const STACK_DECISION = (hasHouseCreative: boolean, variant: AdStackingVariant): AdStackingDecision => ({
  showHouse: hasHouseCreative,
  showAdSense: true,
  variant,
});

export function resolveAdStackingDecision(input: {
  placement: string;
  hasHouseCreative: boolean;
  rotationIndex?: number;
  variant?: AdStackingVariant;
  sessionId?: string;
  experimentId?: string | null;
  reservedHouse?: Set<string>;
  reservedAdSense?: Set<string>;
}): AdStackingDecision {
  const experimentId = input.experimentId === undefined ? AD_STACKING_EXPERIMENT_ID : input.experimentId;
  const isExperimentEligible =
    Boolean(experimentId) && EXPERIMENT_ELIGIBLE_PLACEMENTS.has(input.placement) && Boolean(input.sessionId);

  const variant =
    input.variant ??
    (isExperimentEligible ? resolveExperimentBucket(input.sessionId as string) : AD_STACKING_VARIANT);

  if (variant === 'D_HOUSE_PRIORITY') {
    return input.hasHouseCreative
      ? { showHouse: true, showAdSense: false, variant }
      : { showHouse: false, showAdSense: true, variant };
  }

  if (variant === 'C_RESERVED') {
    const houseList = input.reservedHouse ?? reservedHousePlacements;
    const adSenseList = input.reservedAdSense ?? reservedAdSensePlacements;

    if (houseList.has(input.placement)) {
      return input.hasHouseCreative
        ? { showHouse: true, showAdSense: false, variant }
        : { showHouse: false, showAdSense: true, variant };
    }
    if (adSenseList.has(input.placement)) {
      return { showHouse: false, showAdSense: true, variant };
    }
    return STACK_DECISION(input.hasHouseCreative, variant);
  }

  if (variant === 'B_ALTERNATE' && typeof input.rotationIndex === 'number') {
    const isHouseTurn = input.rotationIndex % 2 === 0;
    if (!isHouseTurn) {
      return { showHouse: false, showAdSense: true, variant };
    }
    return input.hasHouseCreative
      ? { showHouse: true, showAdSense: false, variant }
      : { showHouse: false, showAdSense: true, variant };
  }

  return STACK_DECISION(input.hasHouseCreative, variant);
}
