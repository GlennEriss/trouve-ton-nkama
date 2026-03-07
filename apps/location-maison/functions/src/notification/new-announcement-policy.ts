export type NewAnnouncementCriteria = {
  countryCodes?: string[];
  provinces?: string[];
  cities?: string[];
  typeProperties?: string[];
};

export type RawUserRecord = {
  uid?: string;
  country?: { code?: string };
  notificationParameter?: { isNewAnnouncement?: boolean };
  metadata?: Record<string, unknown>;
};

export type RawPropertyRecord = {
  createdBy?: string;
  title?: string;
  countryCode?: string;
  province?: string;
  city?: string;
  typeProperty?: string;
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function parseCriteria(rawCriteria: unknown): NewAnnouncementCriteria | undefined {
  if (!rawCriteria || typeof rawCriteria !== 'object' || Array.isArray(rawCriteria)) {
    return undefined;
  }

  const record = rawCriteria as Record<string, unknown>;
  const criteria: NewAnnouncementCriteria = {
    countryCodes: normalizeStringArray(record.countryCodes),
    provinces: normalizeStringArray(record.provinces),
    cities: normalizeStringArray(record.cities),
    typeProperties: normalizeStringArray(record.typeProperties),
  };

  const hasCriteria =
    (criteria.countryCodes?.length ?? 0) > 0 ||
    (criteria.provinces?.length ?? 0) > 0 ||
    (criteria.cities?.length ?? 0) > 0 ||
    (criteria.typeProperties?.length ?? 0) > 0;

  return hasCriteria ? criteria : undefined;
}

export function matchesNewAnnouncementCriteria(
  user: RawUserRecord,
  property: RawPropertyRecord
): boolean {
  const metadata = user.metadata && typeof user.metadata === 'object'
    ? user.metadata
    : {};

  const criteria = parseCriteria(
    (metadata as Record<string, unknown>).newAnnouncementCriteria
  );

  const countryCode = normalizeString(property.countryCode);
  const province = normalizeString(property.province);
  const city = normalizeString(property.city);
  const typeProperty = normalizeString(property.typeProperty);

  const criteriaCountries = criteria?.countryCodes ?? [];
  const criteriaProvinces = criteria?.provinces ?? [];
  const criteriaCities = criteria?.cities ?? [];
  const criteriaTypeProperties = criteria?.typeProperties ?? [];

  const hasExplicitCriteria =
    criteriaCountries.length > 0 ||
    criteriaProvinces.length > 0 ||
    criteriaCities.length > 0 ||
    criteriaTypeProperties.length > 0;

  if (!hasExplicitCriteria) {
    const fallbackCountry = normalizeString(user.country?.code);
    if (!fallbackCountry) {
      return true;
    }
    return fallbackCountry === countryCode;
  }

  const matchCountry =
    criteriaCountries.length === 0 || criteriaCountries.includes(countryCode);
  const matchProvince =
    criteriaProvinces.length === 0 || criteriaProvinces.includes(province);
  const matchCity =
    criteriaCities.length === 0 || criteriaCities.includes(city);
  const matchType =
    criteriaTypeProperties.length === 0 || criteriaTypeProperties.includes(typeProperty);

  return matchCountry && matchProvince && matchCity && matchType;
}

