const DEFAULT_ADSENSE_CLIENT = 'ca-pub-2799688336707362';
const DEFAULT_ADSENSE_SLOT = '7503013398';

function normalize(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const ADSENSE_CLIENT = normalize(process.env.NEXT_PUBLIC_ADSENSE_CLIENT) ?? DEFAULT_ADSENSE_CLIENT;

const footerSlot = normalize(process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER) ?? DEFAULT_ADSENSE_SLOT;
const searchInlineSlot = normalize(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_INLINE) ?? footerSlot;
const propertyDetailSlot = normalize(process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROPERTY_DETAIL) ?? footerSlot;
const searchAiSlot = normalize(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_AI) ?? searchInlineSlot;
const immobilierInlineSlot = normalize(process.env.NEXT_PUBLIC_ADSENSE_SLOT_IMMOBILIER_INLINE) ?? searchInlineSlot;
const reelsInlineSlot = normalize(process.env.NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE) ?? footerSlot;

export const ADSENSE_SLOTS = {
  footer: footerSlot,
  searchInline: searchInlineSlot,
  propertyDetail: propertyDetailSlot,
  searchAi: searchAiSlot,
  immobilierInline: immobilierInlineSlot,
  reelsInline: reelsInlineSlot,
} as const;
