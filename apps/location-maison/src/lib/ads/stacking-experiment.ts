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
};

const VALID_VARIANTS: AdStackingVariant[] = ['A_STACK', 'B_ALTERNATE', 'C_RESERVED', 'D_HOUSE_PRIORITY'];

function normalizeVariant(value: string | undefined): AdStackingVariant {
  const normalized = (value ?? '').trim().toUpperCase();
  return (VALID_VARIANTS as string[]).includes(normalized) ? (normalized as AdStackingVariant) : 'A_STACK';
}

function parsePlacementList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
}

export const AD_STACKING_VARIANT = normalizeVariant(process.env.NEXT_PUBLIC_ADS_STACKING_EXPERIMENT_VARIANT);

const reservedHousePlacements = parsePlacementList(
  process.env.NEXT_PUBLIC_ADS_RESERVED_HOUSE_PLACEMENTS,
);
const reservedAdSensePlacements = parsePlacementList(
  process.env.NEXT_PUBLIC_ADS_RESERVED_ADSENSE_PLACEMENTS,
);

const STACK_DECISION = (hasHouseCreative: boolean): AdStackingDecision => ({
  showHouse: hasHouseCreative,
  showAdSense: true,
});

export function resolveAdStackingDecision(input: {
  placement: string;
  hasHouseCreative: boolean;
  rotationIndex?: number;
  variant?: AdStackingVariant;
  reservedHouse?: Set<string>;
  reservedAdSense?: Set<string>;
}): AdStackingDecision {
  const variant = input.variant ?? AD_STACKING_VARIANT;

  if (variant === 'D_HOUSE_PRIORITY') {
    return input.hasHouseCreative
      ? { showHouse: true, showAdSense: false }
      : { showHouse: false, showAdSense: true };
  }

  if (variant === 'C_RESERVED') {
    const houseList = input.reservedHouse ?? reservedHousePlacements;
    const adSenseList = input.reservedAdSense ?? reservedAdSensePlacements;

    if (houseList.has(input.placement)) {
      return input.hasHouseCreative
        ? { showHouse: true, showAdSense: false }
        : { showHouse: false, showAdSense: true };
    }
    if (adSenseList.has(input.placement)) {
      return { showHouse: false, showAdSense: true };
    }
    return STACK_DECISION(input.hasHouseCreative);
  }

  if (variant === 'B_ALTERNATE' && typeof input.rotationIndex === 'number') {
    const isHouseTurn = input.rotationIndex % 2 === 0;
    if (!isHouseTurn) {
      return { showHouse: false, showAdSense: true };
    }
    return input.hasHouseCreative
      ? { showHouse: true, showAdSense: false }
      : { showHouse: false, showAdSense: true };
  }

  return STACK_DECISION(input.hasHouseCreative);
}
