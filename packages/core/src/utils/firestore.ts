/**
 * Convertit une valeur de date Firestore (Timestamp Admin ou Client SDK, Date, chaîne, ou
 * objet structurellement compatible {toDate}/{seconds,nanoseconds}) en chaîne ISO 8601.
 *
 * Duck-typing plutôt que `instanceof Timestamp` : évite une dépendance de packages/core vers
 * firebase-admin/firebase (client) juste pour ce contrôle de type, et reste correct même si
 * deux copies de la classe Timestamp coexistent dans l'arbre de dépendances (les deux apps de
 * ce monorepo utilisent des majors `firebase`/`firebase-admin` différentes).
 *
 * Remplace ~11 implémentations quasi-identiques précédemment dupliquées dans
 * apps/location-maison-admin/src/modules/*\/infrastructure/*.repository.ts.
 */
export function toIsoDate(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const maybe = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };

    if (typeof maybe.toDate === "function") {
      const date = maybe.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
    }

    if (typeof maybe.seconds === "number") {
      const nanoseconds = typeof maybe.nanoseconds === "number" ? maybe.nanoseconds : 0;
      return new Date(maybe.seconds * 1000 + nanoseconds / 1_000_000).toISOString();
    }
  }

  return null;
}
