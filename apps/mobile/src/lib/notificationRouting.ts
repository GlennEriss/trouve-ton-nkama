// Miroir minimal du routage web (actionUrl free-form, voir functions/src/notification/index.ts)
// pour les 2 destinations qui existent côté mobile V1 — les autres actionUrl (profil,
// login-and-security, gifts...) sont ignorées, comme sur le web quand actionUrl est absent.
export type NotificationTarget =
  | { kind: 'listing'; objectID: string }
  | { kind: 'favoris' }
  | null;

export function resolveNotificationTarget(actionUrl?: string | null): NotificationTarget {
  if (!actionUrl) return null;
  const propertyMatch = actionUrl.match(/\/(?:houseDetails|property)\/([^/?#]+)/);
  if (propertyMatch) return { kind: 'listing', objectID: propertyMatch[1] };
  if (actionUrl === '/favoris') return { kind: 'favoris' };
  return null;
}
