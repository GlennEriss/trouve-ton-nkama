export type FavoritePropertySnapshot = Record<string, unknown>;

const WATCHED_FIELDS: Array<{ key: keyof FavoritePropertySnapshot; label: string }> = [
  { key: 'title', label: 'titre' },
  { key: 'price', label: 'prix' },
  { key: 'city', label: 'ville' },
  { key: 'province', label: 'province' },
  { key: 'street', label: 'quartier' },
  { key: 'status', label: 'statut' },
  { key: 'state', label: 'etat' },
  { key: 'typeProperty', label: 'type' },
  { key: 'description', label: 'description' },
  { key: 'images', label: 'photos' },
];

function normalizeFieldValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const maybeImage = item as { fileURL?: unknown; filePATH?: unknown };
      return {
        fileURL: typeof maybeImage.fileURL === 'string' ? maybeImage.fileURL : null,
        filePATH: typeof maybeImage.filePATH === 'string' ? maybeImage.filePATH : null,
      };
    });
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === undefined) {
    return null;
  }

  return value;
}

export function getChangedFavoritePropertyFields(
  before: FavoritePropertySnapshot,
  after: FavoritePropertySnapshot
): string[] {
  const changed: string[] = [];

  for (const field of WATCHED_FIELDS) {
    const beforeValue = normalizeFieldValue(before[field.key]);
    const afterValue = normalizeFieldValue(after[field.key]);

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changed.push(field.label);
    }
  }

  return changed;
}

