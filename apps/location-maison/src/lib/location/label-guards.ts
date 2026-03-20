const OSM_TECHNICAL_LABEL_REGEX = /^osm_(node|way|relation)_[a-z0-9_-]+$/i;

/**
 * Returns true when a location label is user-facing and should be displayed in selects.
 */
export function isDisplayableLocationLabel(value: string | null | undefined): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  return !OSM_TECHNICAL_LABEL_REGEX.test(normalized);
}
