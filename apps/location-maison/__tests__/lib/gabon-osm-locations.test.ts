import {
  deserializeOSMLocationsData,
  getOSMLocations,
  loadOSMLocationsFromRaw,
  serializeOSMLocationsData,
} from '@/data/gabon-osm-locations';

const rawLocations = {
  admin_boundaries: {
    '4': [
      {
        name: 'Estuaire',
        center: { lat: 0.39, lon: 9.45 },
        osm: { id: 1, type: 'relation' },
      },
      {
        name: 'Estuaire',
        center: { lat: 0.4, lon: 9.46 },
        osm: { id: 2, type: 'relation' },
      },
      { name: 'Sans coordonnees', center: { lat: 0, lon: 0 } },
    ],
    '6': [
      {
        name: 'Commune secondaire',
        center: { lat: 0.45, lon: 9.5 },
        osm: { id: 20, type: 'relation' },
      },
    ],
    '8': [],
    '9': [
      {
        name: 'Quartier administratif',
        center: { lat: 0.41, lon: 9.44 },
        osm: { id: 30, type: 'relation' },
      },
    ],
  },
  places: {
    city: [
      {
        names: { fr: 'Libreville' },
        name: 'Libreville fallback',
        center: { lat: 0.4162, lon: 9.4673 },
        osm: { id: 10, type: 'node' },
      },
      { name: 'null', center: { lat: 1, lon: 1 } },
    ],
    town: [
      {
        name: 'Owendo',
        center: { lat: 0.28, lon: 9.5 },
        osm: { id: 11, type: 'node' },
      },
    ],
    suburb: [
      {
        name: 'Akebe',
        center: { lat: 0.39, lon: 9.45 },
        osm: { id: 40, type: 'node' },
      },
      {
        name: 'Akebe',
        center: { lat: 0.391, lon: 9.451 },
        osm: { id: 41, type: 'node' },
      },
    ],
    neighbourhood: [],
    quarter: [],
    village: [],
    hamlet: [],
  },
};

describe('donnees geographiques OSM du Gabon', () => {
  it.each([null, undefined, [], 'invalide', 42])('rejette une racine invalide: %p', (raw) => {
    expect(loadOSMLocationsFromRaw(raw)).toBeNull();
  });

  it('normalise, deduplique, trie et associe les lieux proches', () => {
    const result = loadOSMLocationsFromRaw(rawLocations);

    expect(result).not.toBeNull();
    expect(result?.provinces.map(({ name }) => name)).toEqual(['Estuaire']);
    expect(result?.cities.map(({ name }) => name)).toEqual([
      'Commune secondaire',
      'Libreville',
      'Owendo',
    ]);
    expect(result?.quarters.map(({ name }) => name)).toEqual(['Akebe', 'Quartier administratif']);
    expect(result?.cityToProvince.get('Libreville')).toBe('Estuaire');
    expect(result?.quarterToCity.get('Akebe')).toBeTruthy();
    expect(result?.quarterToProvince.get('Akebe')).toBe('Estuaire');
  });

  it('conserve deux quartiers homonymes lorsqu ils sont dans des villes eloignees', () => {
    const result = loadOSMLocationsFromRaw({
      ...rawLocations,
      places: {
        ...rawLocations.places,
        suburb: [
          rawLocations.places.suburb[0],
          {
            ...rawLocations.places.suburb[0],
            center: { lat: -0.72, lon: 8.78 },
            osm: { id: 42, type: 'node' },
          },
        ],
      },
    });

    expect(result?.quarters.filter(({ name }) => name === 'Akebe')).toHaveLength(2);
  });

  it('serialise les Map et ignore les associations deserialisees invalides', () => {
    const result = loadOSMLocationsFromRaw(rawLocations)!;
    const serialized = serializeOSMLocationsData(result);
    const deserialized = deserializeOSMLocationsData({
      ...serialized,
      cityToProvince: {
        ...serialized.cityToProvince,
        vide: '   ',
        invalide: 12 as unknown as string,
      },
    });

    expect(serialized.cityToProvince).toEqual(expect.objectContaining({ Libreville: 'Estuaire' }));
    expect(deserialized.cityToProvince).toBeInstanceOf(Map);
    expect(deserialized.cityToProvince.get('Libreville')).toBe('Estuaire');
    expect(deserialized.cityToProvince.has('vide')).toBe(false);
    expect(deserialized.cityToProvince.has('invalide')).toBe(false);
  });

  it('charge le jeu embarque une seule fois en memoire', () => {
    const first = getOSMLocations();
    const second = getOSMLocations();

    expect(first).toBe(second);
    expect(first.provinces.length).toBeGreaterThan(0);
    expect(first.cities.length).toBeGreaterThan(0);
  });
});
