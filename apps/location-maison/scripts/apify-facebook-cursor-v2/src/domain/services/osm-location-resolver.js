const osmData = require('../../../../../src/data/gabon_osm.json');

const HEURISTIC_ALIASES = [
  {
    regex: /\bagondje\b|\bangondje\b|\bbeau lieu\b/i,
    district: 'Angondje',
    city: 'Akanda',
    province: 'Estuaire',
  },
  {
    regex: /\bp[ée]diatri(?:e|que)?\b/i,
    district: 'Owendo',
    city: 'Owendo',
    province: 'Estuaire',
  },
  {
    regex: /\bpk\s*13\b|\bpk13\b/i,
    district: 'PK13',
    city: 'Libreville',
    province: 'Estuaire',
  },
];

function normalizeTerm(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCorpus(...parts) {
  const merged = parts.filter(Boolean).join(' ');
  const normalized = normalizeTerm(merged);
  return normalized ? ` ${normalized} ` : '';
}

function toLocation(item, type, source, originalType) {
  const name = item?.names?.fr || item?.name;
  if (!name || String(name).trim() === '' || String(name).trim().toLowerCase() === 'null') {
    return null;
  }
  const lat = Number(item?.center?.lat || 0);
  const lon = Number(item?.center?.lon || 0);
  if (!lat && !lon) return null;

  return {
    name: String(name).trim(),
    normalizedName: normalizeTerm(name),
    lat,
    lon,
    type,
    source,
    originalType,
  };
}

function dedupeByName(locations) {
  const seen = new Map();
  locations.forEach((item) => {
    if (!item || !item.name) return;
    if (!seen.has(item.normalizedName)) {
      seen.set(item.normalizedName, item);
    }
  });
  return Array.from(seen.values());
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function findNearest(target, candidates, maxDistanceKm) {
  let best = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = haversineKm(target, candidate);
    if (distance <= maxDistanceKm && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function buildProvinces() {
  const provincesRaw = osmData?.admin_boundaries?.['4'] || [];
  return dedupeByName(
    provincesRaw.map((item) => toLocation(item, 'province', 'admin_boundaries', 'admin_level_4'))
  );
}

function buildCities() {
  const list = [];
  const placesCity = osmData?.places?.city || [];
  const placesTown = osmData?.places?.town || [];
  const admin6 = osmData?.admin_boundaries?.['6'] || [];
  const admin8 = osmData?.admin_boundaries?.['8'] || [];

  placesCity.forEach((item) => list.push(toLocation(item, 'city', 'places', 'city')));
  placesTown.forEach((item) => list.push(toLocation(item, 'city', 'places', 'town')));
  admin6.forEach((item) => list.push(toLocation(item, 'city', 'admin_boundaries', 'admin_level_6')));
  admin8.forEach((item) => list.push(toLocation(item, 'city', 'admin_boundaries', 'admin_level_8')));

  return dedupeByName(list);
}

function buildQuarters() {
  const list = [];
  const placeTypes = ['suburb', 'neighbourhood', 'quarter', 'village', 'hamlet', 'locality'];

  placeTypes.forEach((placeType) => {
    const items = osmData?.places?.[placeType] || [];
    items.forEach((item) => list.push(toLocation(item, 'quarter', 'places', placeType)));
  });

  const admin9 = osmData?.admin_boundaries?.['9'] || [];
  const admin10 = osmData?.admin_boundaries?.['10'] || [];
  admin9.forEach((item) => list.push(toLocation(item, 'quarter', 'admin_boundaries', 'admin_level_9')));
  admin10.forEach((item) => list.push(toLocation(item, 'quarter', 'admin_boundaries', 'admin_level_10')));

  return dedupeByName(list);
}

function associateCitiesToProvinces(cities, provinces) {
  const map = new Map();
  cities.forEach((city) => {
    const nearest = findNearest(city, provinces, 100);
    if (nearest) {
      map.set(city.name, nearest.name);
    }
  });
  return map;
}

function associateQuartersToCities(quarters, cities) {
  const map = new Map();
  quarters.forEach((quarter) => {
    const isUrban = ['suburb', 'neighbourhood', 'quarter', 'admin_level_9', 'admin_level_10'].includes(
      quarter.originalType || ''
    );
    const maxDistance = isUrban ? 35 : 80;
    const nearest = findNearest(quarter, cities, maxDistance);
    if (nearest) {
      map.set(quarter.name, nearest.name);
    }
  });
  return map;
}

function associateQuartersToProvinces(quarters, provinces, quarterToCity, cityToProvince) {
  const map = new Map();
  quarters.forEach((quarter) => {
    const cityName = quarterToCity.get(quarter.name);
    if (cityName) {
      const provinceName = cityToProvince.get(cityName);
      if (provinceName) {
        map.set(quarter.name, provinceName);
        return;
      }
    }

    const nearest = findNearest(quarter, provinces, 150);
    if (nearest) {
      map.set(quarter.name, nearest.name);
    }
  });
  return map;
}

class OSMGabonLocationResolver {
  constructor() {
    this.provinces = buildProvinces();
    this.cities = buildCities();
    this.quarters = buildQuarters();

    this.cityToProvince = associateCitiesToProvinces(this.cities, this.provinces);
    this.quarterToCity = associateQuartersToCities(this.quarters, this.cities);
    this.quarterToProvince = associateQuartersToProvinces(
      this.quarters,
      this.provinces,
      this.quarterToCity,
      this.cityToProvince
    );

    this.provincesByName = new Map(this.provinces.map((item) => [item.normalizedName, item]));
    this.citiesByName = new Map(this.cities.map((item) => [item.normalizedName, item]));
    this.quartersByName = new Map(this.quarters.map((item) => [item.normalizedName, item]));
  }

  findByName(name, collectionMap) {
    const normalized = normalizeTerm(name);
    if (!normalized) return null;
    return collectionMap.get(normalized) || null;
  }

  findBestMatch(normalizedCorpus, locations) {
    if (!normalizedCorpus) return null;
    let best = null;
    let bestScore = -1;

    for (const location of locations) {
      const normalizedName = location.normalizedName;
      if (!normalizedName || normalizedName.length < 3) continue;
      if (!normalizedCorpus.includes(` ${normalizedName} `)) continue;

      const tokenScore = normalizedName.split(' ').length * 100;
      const score = tokenScore + normalizedName.length;
      if (score > bestScore) {
        bestScore = score;
        best = location;
      }
    }
    return best;
  }

  buildHeuristicFallback(normalizedCorpus) {
    for (const alias of HEURISTIC_ALIASES) {
      if (alias.regex.test(normalizedCorpus)) {
        const cityMatch = this.findByName(alias.city, this.citiesByName);
        const provinceMatch = this.findByName(alias.province, this.provincesByName);
        const quarterMatch = this.findByName(alias.district, this.quartersByName);
        const point = quarterMatch || cityMatch || provinceMatch || null;

        return {
          district: alias.district || '',
          city: alias.city || '',
          province: alias.province || '',
          longitude: point?.lon || 0,
          latitude: point?.lat || 0,
          streetLon: quarterMatch?.lon || 0,
          streetLat: quarterMatch?.lat || 0,
          cityLon: cityMatch?.lon || 0,
          cityLat: cityMatch?.lat || 0,
          provinceLon: provinceMatch?.lon || 0,
          provinceLat: provinceMatch?.lat || 0,
        };
      }
    }
    return null;
  }

  resolveFromText(...parts) {
    const empty = {
      district: '',
      city: '',
      province: '',
      longitude: 0,
      latitude: 0,
      streetLon: 0,
      streetLat: 0,
      cityLon: 0,
      cityLat: 0,
      provinceLon: 0,
      provinceLat: 0,
    };

    const normalized = normalizeCorpus(...parts);
    if (!normalized) return empty;

    const quarterMatch = this.findBestMatch(normalized, this.quarters);
    const cityMatch = this.findBestMatch(normalized, this.cities);
    const provinceMatch = this.findBestMatch(normalized, this.provinces);

    let resolvedQuarter = quarterMatch;
    let resolvedCity = null;
    let resolvedProvince = null;

    if (resolvedQuarter) {
      const cityName = this.quarterToCity.get(resolvedQuarter.name);
      const provinceName = this.quarterToProvince.get(resolvedQuarter.name);

      if (cityName) {
        resolvedCity = this.findByName(cityName, this.citiesByName);
      }
      if (provinceName) {
        resolvedProvince = this.findByName(provinceName, this.provincesByName);
      }
    }

    if (!resolvedCity && cityMatch) {
      resolvedCity = cityMatch;
    }

    if (!resolvedProvince && resolvedCity) {
      const provinceName = this.cityToProvince.get(resolvedCity.name);
      if (provinceName) {
        resolvedProvince = this.findByName(provinceName, this.provincesByName);
      }
    }

    if (!resolvedProvince && provinceMatch) {
      resolvedProvince = provinceMatch;
    }

    const fallbackPoint = resolvedQuarter || resolvedCity || resolvedProvince;
    if (!fallbackPoint) {
      const heuristic = this.buildHeuristicFallback(normalized);
      return heuristic || empty;
    }

    return {
      district: resolvedQuarter?.name || '',
      city: resolvedCity?.name || '',
      province: resolvedProvince?.name || '',
      longitude: fallbackPoint.lon || 0,
      latitude: fallbackPoint.lat || 0,
      streetLon: resolvedQuarter?.lon || 0,
      streetLat: resolvedQuarter?.lat || 0,
      cityLon: resolvedCity?.lon || 0,
      cityLat: resolvedCity?.lat || 0,
      provinceLon: resolvedProvince?.lon || 0,
      provinceLat: resolvedProvince?.lat || 0,
    };
  }

  getHints(limit = 20) {
    return {
      provinces: this.provinces.slice(0, limit).map((item) => item.name),
      cities: this.cities.slice(0, limit).map((item) => item.name),
      quarters: this.quarters.slice(0, limit).map((item) => item.name),
    };
  }
}

module.exports = { OSMGabonLocationResolver };
