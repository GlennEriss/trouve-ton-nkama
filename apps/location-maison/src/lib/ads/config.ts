import { createLogger } from '@/lib/logger';

const logger = createLogger('lib.ads.config');

const DEFAULT_ADSENSE_CLIENT = 'ca-pub-2799688336707362';
const DEFAULT_ADSENSE_SLOT = '7503013398';

function normalize(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveRuntimeEnvironment(): 'dev' | 'preprod' | 'prod' {
  const raw = (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'prod';
  if (raw === 'preprod' || raw === 'staging') return 'preprod';
  return 'dev';
}

const isProductionRuntime = resolveRuntimeEnvironment() === 'prod';

// Audit AUDIT-ADSENSE-REVENUS-2026-09.md §5.5 : un slot qui retombe sur l'emplacement d'une
// AUTRE surface (ex. Reels -> Footer) ne doit plus le faire silencieusement en production —
// le format/contexte differe et fausse le diagnostic RPM/viewability par surface. On garde le
// fallback fonctionnel (pas de slot vide) mais on log une alerte explicite et bruyante.
function resolveSlot(label: string, envVar: string, fallback: string): string {
  const explicit = normalize(process.env[envVar]);
  if (explicit) {
    return explicit;
  }

  if (isProductionRuntime) {
    logger.error(
      `Slot AdSense "${label}" non configure (${envVar} manquant) : fallback silencieux vers un autre emplacement en production, format/rapports fausses pour cette surface.`,
      { label, envVar, fallbackSlot: fallback },
    );
  }

  return fallback;
}

export const ADSENSE_CLIENT = normalize(process.env.NEXT_PUBLIC_ADSENSE_CLIENT) ?? DEFAULT_ADSENSE_CLIENT;

const footerSlot = normalize(process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER) ?? DEFAULT_ADSENSE_SLOT;
const searchInlineSlot = resolveSlot('search_inline', 'NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_INLINE', footerSlot);
const propertyDetailSlot = resolveSlot('property_detail', 'NEXT_PUBLIC_ADSENSE_SLOT_PROPERTY_DETAIL', footerSlot);
const searchAiSlot = resolveSlot('search_ai', 'NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_AI', searchInlineSlot);
const immobilierInlineSlot = resolveSlot(
  'immobilier_inline',
  'NEXT_PUBLIC_ADSENSE_SLOT_IMMOBILIER_INLINE',
  searchInlineSlot,
);
const reelsInlineSlot = resolveSlot('reels_inline', 'NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE', footerSlot);

export const ADSENSE_SLOTS = {
  footer: footerSlot,
  searchInline: searchInlineSlot,
  propertyDetail: propertyDetailSlot,
  searchAi: searchAiSlot,
  immobilierInline: immobilierInlineSlot,
  reelsInline: reelsInlineSlot,
} as const;
