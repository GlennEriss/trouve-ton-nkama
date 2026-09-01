/**
 * Le SDK Admin sérialise ses Timestamp en JSON avec un préfixe `_` (`_seconds`,
 * `_nanoseconds`) — voir `firebase-admin.Timestamp`. Mais tout le code client qui lit
 * `currentPromotion.{start,end}Date` (PromotionButton.tsx, PromotionBadge.tsx,
 * use-promotion.ts) attend `.seconds`/`.nanoseconds` sans préfixe, comme le SDK client.
 * Sans cette normalisation avant `NextResponse.json`, `hasActivePromotion` vaut toujours
 * `false` côté client — même juste après une promotion réussie et un rechargement de
 * page — alors que la donnée est correcte en base (constaté en e2e réel sur
 * /api/announcer/ads). Partagé ici pour que toute route qui renvoie `currentPromotion` brut
 * (Admin SDK) au client applique la même normalisation, plutôt que de réintroduire le même
 * bug route par route — voir aussi /api/property/promoted, exposé au même risque.
 */
function serializeTimestamp(value: unknown): { seconds: number; nanoseconds: number } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const withToMillis = value as { toMillis?: () => number; nanoseconds?: unknown; _nanoseconds?: unknown };
  if (typeof withToMillis.toMillis === 'function') {
    const millis = withToMillis.toMillis();
    const nanoseconds =
      typeof withToMillis.nanoseconds === 'number'
        ? withToMillis.nanoseconds
        : typeof withToMillis._nanoseconds === 'number'
          ? withToMillis._nanoseconds
          : 0;
    return { seconds: Math.floor(millis / 1000), nanoseconds };
  }
  return null;
}

function serializePromotion(promotion: unknown) {
  if (!promotion || typeof promotion !== 'object') {
    return promotion;
  }
  const record = promotion as Record<string, unknown>;
  return {
    ...record,
    startDate: serializeTimestamp(record.startDate) ?? record.startDate,
    endDate: serializeTimestamp(record.endDate) ?? record.endDate,
  };
}

/** Normalise `property.currentPromotion.{startDate,endDate}` avant `NextResponse.json`. */
export function serializePropertyPromotion<T extends { currentPromotion?: unknown }>(property: T): T {
  if (!property.currentPromotion) {
    return property;
  }
  return {
    ...property,
    currentPromotion: serializePromotion(property.currentPromotion),
  };
}
