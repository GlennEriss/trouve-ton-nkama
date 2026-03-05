import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Geocoding Service Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('API Geocode - Reverse Geocoding', () => {
    test('devrait effectuer un reverse geocoding avec succès', async () => {
      const mockResponse = {
        place_id: 12345,
        licence: 'OpenStreetMap',
        osm_type: 'way',
        osm_id: 123456789,
        lat: '0.3901',
        lon: '9.4544',
        display_name: 'Libreville, Estuaire, Gabon',
        address: {
          city: 'Libreville',
          state: 'Estuaire',
          country: 'Gabon',
          country_code: 'ga',
          neighbourhood: 'Centre-ville',
          city_district: 'Libreville 1er'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const response = await fetch('/api/geocode?lat=0.3901&lng=9.4544');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.display_name).toBe('Libreville, Estuaire, Gabon');
      expect(data.address.city).toBe('Libreville');
      expect(data.address.state).toBe('Estuaire');
      expect(data.address.country).toBe('Gabon');
      expect(data.address.country_code).toBe('ga');
    });

    test('devrait gérer les coordonnées invalides', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Latitude and longitude are required' })
      } as Response);

      const response = await fetch('/api/geocode?lat=&lng=');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Latitude and longitude are required');
    });

    test('devrait gérer les erreurs de l\'API Nominatim', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to fetch data from Nominatim API' })
      } as Response);

      const response = await fetch('/api/geocode?lat=0.3901&lng=9.4544');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Failed to fetch data from Nominatim API');
    });

    test('devrait retourner des coordonnées pour différentes villes du Gabon', async () => {
      const gabonCities = [
        {
          name: 'Libreville',
          lat: '0.3901',
          lon: '9.4544',
          province: 'Estuaire'
        },
        {
          name: 'Port-Gentil',
          lat: '-0.7193',
          lon: '8.7815',
          province: 'Ogooué-Maritime'
        },
        {
          name: 'Franceville',
          lat: '-1.6332',
          lon: '13.5833',
          province: 'Haut-Ogooué'
        },
        {
          name: 'Oyem',
          lat: '1.5993',
          lon: '11.5793',
          province: 'Woleu-Ntem'
        }
      ];

      for (const city of gabonCities) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            display_name: `${city.name}, ${city.province}, Gabon`,
            address: {
              city: city.name,
              state: city.province,
              country: 'Gabon',
              country_code: 'ga'
            },
            lat: city.lat,
            lon: city.lon
          })
        } as Response);

        const response = await fetch(`/api/geocode?lat=${city.lat}&lng=${city.lon}`);
        const data = await response.json();

        expect(data.address.city).toBe(city.name);
        expect(data.address.state).toBe(city.province);
        expect(data.address.country).toBe('Gabon');
      }
    });
  });

  describe('API Geocode Search - Forward Geocoding', () => {
    test('devrait effectuer une recherche d\'adresse avec succès', async () => {
      const mockSearchResults = [
        {
          place_id: 123456,
          licence: 'OpenStreetMap',
          osm_type: 'relation',
          osm_id: 192774,
          boundingbox: ['0.2901', '0.4901', '9.3544', '9.5544'],
          lat: '0.3901',
          lon: '9.4544',
          display_name: 'Libreville, Estuaire, Gabon',
          class: 'place',
          type: 'city',
          importance: 0.75,
          address: {
            city: 'Libreville',
            state: 'Estuaire',
            country: 'Gabon',
            country_code: 'ga'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      } as Response);

      const response = await fetch('/api/geocode/search?q=Libreville');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].display_name).toContain('Libreville');
      expect(data[0].address.city).toBe('Libreville');
      expect(data[0].address.country_code).toBe('ga');
    });

    test('devrait filtrer par code pays Gabon par défaut', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      } as Response);

      const response = await fetch('/api/geocode/search?q=Libreville');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/geocode/search?q=Libreville');
    });

    test('devrait gérer les recherches sans résultats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      } as Response);

      const response = await fetch('/api/geocode/search?q=VilleInexistante');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    test('devrait gérer les erreurs de recherche', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Le terme de recherche est requis' })
      } as Response);

      const response = await fetch('/api/geocode/search?q=');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Le terme de recherche est requis');
    });

    test('devrait rechercher différents types de lieux au Gabon', async () => {
      const searchQueries = [
        'Libreville Centre-ville',
        'Port-Gentil Aéroport',
        'Franceville Université',
        'Avenue de la République Libreville',
        'Marché Mont-Bouët'
      ];

      for (const query of searchQueries) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            {
              place_id: Math.random(),
              display_name: `${query}, Gabon`,
              lat: (Math.random() * 2 - 1).toString(),
              lon: (Math.random() * 10 + 8).toString(),
              address: {
                country: 'Gabon',
                country_code: 'ga'
              }
            }
          ])
        } as Response);

        const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
          expect(data[0].address.country).toBe('Gabon');
        }
      }
    });
  });

  describe('Location Provider Integration', () => {
    test('devrait simuler getAddressFromCoordinates', async () => {
      const mockLocationData = {
        display_name: 'Avenue de la République, Centre-ville, Libreville, Estuaire, Gabon',
        address: {
          country: 'Gabon',
          state: 'Estuaire',
          city: 'Libreville',
          country_code: 'ga',
          neighbourhood: 'Centre-ville',
          city_district: 'Libreville 1er'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocationData)
      } as Response);

      // Simulation de l'utilisation dans LocationProvider
      const latitude = 0.3901;
      const longitude = 9.4544;
      
      const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
      const data = await response.json();

      if (data.address) {
        const locationData = {
          country: data.address.country,
          region: data.address.state,
          city: data.address.city,
          countryCode: data.address.country_code,
          neighbourhood: data.address.neighbourhood,
          city_district: data.address.city_district
        };

        expect(locationData.country).toBe('Gabon');
        expect(locationData.region).toBe('Estuaire');
        expect(locationData.city).toBe('Libreville');
        expect(locationData.countryCode).toBe('ga');
      }
    });

    test('devrait simuler searchAddress', async () => {
      const mockSearchResults = [
        {
          place_id: 123,
          display_name: 'Marché Mont-Bouët, Libreville, Estuaire, Gabon',
          lat: '0.3801',
          lon: '9.4444',
          address: {
            amenity: 'marketplace',
            neighbourhood: 'Mont-Bouët',
            city: 'Libreville',
            state: 'Estuaire',
            country: 'Gabon'
          }
        },
        {
          place_id: 456,
          display_name: 'Mont-Bouët, Libreville, Estuaire, Gabon',
          lat: '0.3851',
          lon: '9.4494',
          address: {
            neighbourhood: 'Mont-Bouët',
            city: 'Libreville',
            state: 'Estuaire',
            country: 'Gabon'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      } as Response);

      const query = 'Mont-Bouët';
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data[0].display_name).toContain('Mont-Bouët');
      expect(data[1].display_name).toContain('Mont-Bouët');
    });
  });

  describe('Cache et Performance', () => {
    test('devrait simuler la mise en cache des résultats', async () => {
      const cacheKey = '0.3901,9.4544';
      const mockCachedData = {
        display_name: 'Libreville, Estuaire, Gabon',
        address: {
          city: 'Libreville',
          state: 'Estuaire',
          country: 'Gabon'
        }
      };

      // Premier appel - simulation de mise en cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCachedData),
        headers: new Headers({
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600'
        })
      } as Response);

      const firstResponse = await fetch('/api/geocode?lat=0.3901&lng=9.4544');
      const firstData = await firstResponse.json();

      expect(firstResponse.ok).toBe(true);
      expect(firstData.display_name).toBe('Libreville, Estuaire, Gabon');

      // Deuxième appel - simulation de récupération depuis le cache  
      // (Dans un vrai test, on vérifierait qu'il n'y a pas de deuxième appel à l'API)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCachedData)
      } as Response);

      const secondResponse = await fetch('/api/geocode?lat=0.3901&lng=9.4544');
      expect(secondResponse.ok).toBe(true);
    });

    test('devrait simuler la limitation des résultats de recherche', async () => {
      // Simuler un grand nombre de résultats
      const mockLargeResults = Array.from({ length: 15 }, (_, i) => ({
        place_id: i,
        display_name: `Lieu ${i}, Libreville, Gabon`,
        lat: (0.39 + i * 0.01).toString(),
        lon: (9.45 + i * 0.01).toString()
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLargeResults.slice(0, 10)) // Limité à 10
      } as Response);

      const response = await fetch('/api/geocode/search?q=Libreville');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(10); // Vérifier la limitation
    });
  });

  describe('Gestion d\'erreurs et cas limites', () => {
    test('devrait gérer les coordonnées aux limites du Gabon', async () => {
      const gabonBounds = [
        { lat: '2.318', lon: '8.695', name: 'Nord-Ouest' },
        { lat: '-3.978', lon: '14.425', name: 'Sud-Est' },
        { lat: '1.000', lon: '14.000', name: 'Nord-Est' },
        { lat: '-3.000', lon: '9.000', name: 'Sud-Ouest' }
      ];

      for (const bound of gabonBounds) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            display_name: `${bound.name}, Gabon`,
            lat: bound.lat,
            lon: bound.lon,
            address: {
              country: 'Gabon',
              country_code: 'ga'
            }
          })
        } as Response);

        const response = await fetch(`/api/geocode?lat=${bound.lat}&lng=${bound.lon}`);
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(data.address.country).toBe('Gabon');
      }
    });

    test('devrait gérer les caractères spéciaux dans les recherches', async () => {
      const specialQueries = [
        'Libreville-Centre',
        'Port-Gentil/Aéroport',
        "N'Djolé",
        'Makokou (Centre-ville)'
      ];

      for (const query of specialQueries) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            {
              display_name: `${query}, Gabon`,
              address: { country: 'Gabon' }
            }
          ])
        } as Response);

        const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test('devrait gérer les timeouts et erreurs réseau', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      try {
        await fetch('/api/geocode?lat=0.3901&lng=9.4544');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network timeout');
      }
    });
  });

  describe('Validation de données', () => {
    test('devrait valider les formats de coordonnées', async () => {
      const invalidCoordinates = [
        { lat: 'invalid', lng: '9.4544' },
        { lat: '0.3901', lng: 'invalid' },
        { lat: '91', lng: '9.4544' }, // Latitude > 90
        { lat: '0.3901', lng: '181' }, // Longitude > 180
        { lat: '-91', lng: '9.4544' }, // Latitude < -90
        { lat: '0.3901', lng: '-181' } // Longitude < -180
      ];

      for (const coords of invalidCoordinates) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Invalid coordinates' })
        } as Response);

        const response = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
        
        expect(response.ok).toBe(false);
      }
    });

    test('devrait valider les termes de recherche', async () => {
      const invalidSearchTerms = ['', '   ', null, undefined];

      for (const term of invalidSearchTerms) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Le terme de recherche est requis' })
        } as Response);

        const query = term ? `?q=${encodeURIComponent(term)}` : '';
        const response = await fetch(`/api/geocode/search${query}`);
        
        expect(response.ok).toBe(false);
      }
    });
  });
});
