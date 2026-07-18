function normalize(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Pixel ID public (visible dans le code source de toute façon, ce n'est pas un secret) — non
 * défini tant que le Business Manager Meta n'a pas été configuré, auquel cas le Pixel et la
 * Conversions API restent des no-ops silencieux partout (voir isMetaPixelEnabled()).
 */
export const META_PIXEL_ID = normalize(process.env.NEXT_PUBLIC_META_PIXEL_ID);

export function isMetaPixelEnabled(): boolean {
  return Boolean(META_PIXEL_ID);
}

export const META_GRAPH_API_VERSION = 'v21.0';
