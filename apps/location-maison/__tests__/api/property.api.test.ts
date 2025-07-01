import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock de Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn()
};

jest.mock('@/redis/client', () => ({
  default: mockRedis
}));

// Mock de la base de données property
const mockGetProperties = jest.fn();
const mockGetPropertyById = jest.fn();
const mockGetPropertiesCount = jest.fn();
const mockGetPromotedProperties = jest.fn();

jest.mock('@/db/property.db', () => ({
  getProperties: mockGetProperties,
  getPropertyById: mockGetPropertyById,
  getPropertiesCount: mockGetPropertiesCount,
  getPromotedProperties: mockGetPromotedProperties
}));

// Import des routes après les mocks
import { GET as getPropertiesList } from '@/app/api/property/list/route';

describe('Property API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REDIS_CATALOG_TTL = '600';
  });

  describe('GET /api/property/list', () => {
    const mockPropertiesData = {
      properties: [
        {
          id: 'prop-1',
          title: 'Belle maison familiale',
          description: 'Maison de 4 chambres avec jardin',
          price: 150000,
          location: 'Libreville',
          type: 'home',
          area: 120,
          bedrooms: 4,
          images: ['image1.jpg', 'image2.jpg']
        },
        {
          id: 'prop-2',
          title: 'Appartement moderne',
          description: 'Appartement 2 pièces centre-ville',
          price: 85000,
          location: 'Port-Gentil',
          type: 'apartment',
          area: 65,
          bedrooms: 2,
          images: ['apt1.jpg']
        }
      ],
      hasMore: true,
      lastDoc: 'doc-cursor-123'
    };

    test('devrait retourner la liste des propriétés avec pagination par défaut', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null); // Pas de cache

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.properties).toHaveLength(2);
      expect(data.hasMore).toBe(true);
      expect(data.lastDoc).toBe('doc-cursor-123');
      
      expect(mockGetProperties).toHaveBeenCalledWith({
        limitPerPage: 10,
        lastDoc: null
      });

      // Vérifier la mise en cache
      expect(mockRedis.set).toHaveBeenCalledWith(
        'properties:list:10:first',
        mockPropertiesData,
        { ex: 600 }
      );
    });

    test('devrait respecter la pagination personnalisée', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list?limitPerPage=5&lastDoc=cursor-abc');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetProperties).toHaveBeenCalledWith({
        limitPerPage: 5,
        lastDoc: 'cursor-abc'
      });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'properties:list:5:cursor-abc',
        mockPropertiesData,
        { ex: 600 }
      );
    });

    test('devrait retourner les données du cache Redis si disponibles', async () => {
      const cachedData = {
        properties: [{ id: 'cached-prop', title: 'Propriété en cache' }],
        hasMore: false
      };
      
      mockRedis.get.mockResolvedValue(cachedData);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(cachedData);
      
      // Ne devrait pas appeler la base de données
      expect(mockGetProperties).not.toHaveBeenCalled();
      
      // Ne devrait pas mettre à jour le cache
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    test('devrait gérer les erreurs Redis en lecture', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockGetProperties.mockResolvedValue(mockPropertiesData);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPropertiesData);
      
      // Devrait quand même appeler la base de données
      expect(mockGetProperties).toHaveBeenCalled();
    });

    test('devrait gérer les erreurs Redis en écriture', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error('Redis write failed'));
      mockGetProperties.mockResolvedValue(mockPropertiesData);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPropertiesData);
      
      // L'erreur Redis ne devrait pas affecter la réponse
    });

    test('devrait gérer les erreurs de base de données', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGetProperties.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch properties');
    });

    test('devrait valider les paramètres de pagination', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      // Test avec des paramètres invalides
      const request = new NextRequest('http://localhost:3000/api/property/list?limitPerPage=invalid&lastDoc=');

      const response = await getPropertiesList(request);

      expect(response.status).toBe(200);
      
      // Devrait utiliser les valeurs par défaut
      expect(mockGetProperties).toHaveBeenCalledWith({
        limitPerPage: 10, // Valeur par défaut
        lastDoc: null    // Chaîne vide devient null
      });
    });

    test('devrait gérer les limites de pagination extrêmes', async () => {
      mockGetProperties.mockResolvedValue({ properties: [], hasMore: false });
      mockRedis.get.mockResolvedValue(null);

      const testCases = [
        { limitPerPage: '0', expected: 0 },
        { limitPerPage: '1', expected: 1 },
        { limitPerPage: '100', expected: 100 },
        { limitPerPage: '999999', expected: 999999 }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest(`http://localhost:3000/api/property/list?limitPerPage=${testCase.limitPerPage}`);

        const response = await getPropertiesList(request);

        expect(response.status).toBe(200);
        expect(mockGetProperties).toHaveBeenCalledWith({
          limitPerPage: testCase.expected,
          lastDoc: null
        });

        jest.clearAllMocks();
      }
    });

    test('devrait retourner les bons headers de cache', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);

      expect(response.headers.get('Cache-Control')).toBe(
        'public, s-maxage=60, stale-while-revalidate=60'
      );
    });

    test('devrait gérer une liste de propriétés vide', async () => {
      const emptyData = { properties: [], hasMore: false, lastDoc: null };
      mockGetProperties.mockResolvedValue(emptyData);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.properties).toEqual([]);
      expect(data.hasMore).toBe(false);
      expect(data.lastDoc).toBeNull();
    });

    test('devrait gérer les propriétés avec données manquantes', async () => {
      const incompleteProperties = {
        properties: [
          {
            id: 'incomplete-1',
            title: 'Propriété incomplète'
            // Manque description, price, etc.
          },
          {
            id: 'incomplete-2'
            // Manque title
          }
        ],
        hasMore: false
      };

      mockGetProperties.mockResolvedValue(incompleteProperties);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.properties).toHaveLength(2);
      // L'API devrait retourner les données telles qu'elles sont
    });
  });

  describe('Gestion du cache Redis', () => {
    test('devrait utiliser le TTL configuré via variable d\'environnement', async () => {
      process.env.REDIS_CATALOG_TTL = '1200'; // 20 minutes
      
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      await getPropertiesList(request);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'properties:list:10:first',
        mockPropertiesData,
        { ex: 1200 } // TTL personnalisé
      );
    });

    test('devrait utiliser le TTL par défaut si variable non définie', async () => {
      delete process.env.REDIS_CATALOG_TTL;
      
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list');

      await getPropertiesList(request);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'properties:list:10:first',
        mockPropertiesData,
        { ex: 600 } // TTL par défaut
      );
    });

    test('devrait créer des clés de cache uniques pour chaque pagination', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const testCases = [
        { url: 'http://localhost:3000/api/property/list', expectedKey: 'properties:list:10:first' },
        { url: 'http://localhost:3000/api/property/list?limitPerPage=5', expectedKey: 'properties:list:5:first' },
        { url: 'http://localhost:3000/api/property/list?lastDoc=abc', expectedKey: 'properties:list:10:abc' },
        { url: 'http://localhost:3000/api/property/list?limitPerPage=20&lastDoc=xyz', expectedKey: 'properties:list:20:xyz' }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest(testCase.url);
        await getPropertiesList(request);

        expect(mockRedis.set).toHaveBeenCalledWith(
          testCase.expectedKey,
          mockPropertiesData,
          { ex: 600 }
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('Performance et robustesse', () => {
    test('devrait gérer les requêtes concurrentes', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/property/list')
      );

      const responses = await Promise.all(
        requests.map(request => getPropertiesList(request))
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.properties).toHaveLength(2);
      }

      // Chaque requête devrait appeler la base (pas de cache)
      expect(mockGetProperties).toHaveBeenCalledTimes(5);
    });

    test('devrait gérer les timeouts de base de données', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGetProperties.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 100)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/property/list');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch properties');
    });

    test('devrait gérer les grandes réponses', async () => {
      // Simuler une grande liste de propriétés
      const largePropertiesData = {
        properties: Array.from({ length: 1000 }, (_, i) => ({
          id: `prop-${i}`,
          title: `Propriété ${i}`,
          description: `Description de la propriété ${i}`,
          price: 100000 + i * 1000,
          location: i % 2 === 0 ? 'Libreville' : 'Port-Gentil',
          type: i % 3 === 0 ? 'home' : i % 3 === 1 ? 'apartment' : 'villa'
        })),
        hasMore: true,
        lastDoc: 'large-cursor'
      };

      mockGetProperties.mockResolvedValue(largePropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list?limitPerPage=1000');

      const response = await getPropertiesList(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.properties).toHaveLength(1000);
      expect(data.hasMore).toBe(true);
    });

    test('devrait gérer les erreurs de parsing des paramètres', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const malformedUrls = [
        'http://localhost:3000/api/property/list?limitPerPage=abc',
        'http://localhost:3000/api/property/list?limitPerPage=-5',
        'http://localhost:3000/api/property/list?limitPerPage=1.5',
        'http://localhost:3000/api/property/list?limitPerPage=null'
      ];

      for (const url of malformedUrls) {
        const request = new NextRequest(url);
        const response = await getPropertiesList(request);

        expect(response.status).toBe(200);
        // Devrait utiliser la valeur par défaut (10) pour les paramètres invalides
        expect(mockGetProperties).toHaveBeenCalledWith({
          limitPerPage: 10,
          lastDoc: null
        });

        jest.clearAllMocks();
      }
    });
  });

  describe('Validation et filtrage', () => {
    test('devrait gérer les paramètres lastDoc avec caractères spéciaux', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const specialCharsCursors = [
        'cursor-with-spaces',
        'cursor%20encoded',
        'cursor_with_underscores',
        'cursor-with-hyphens',
        'cursor.with.dots'
      ];

      for (const cursor of specialCharsCursors) {
        const request = new NextRequest(`http://localhost:3000/api/property/list?lastDoc=${cursor}`);
        const response = await getPropertiesList(request);

        expect(response.status).toBe(200);
        expect(mockGetProperties).toHaveBeenCalledWith({
          limitPerPage: 10,
          lastDoc: cursor
        });

        jest.clearAllMocks();
      }
    });

    test('devrait ignorer les paramètres non reconnus', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/property/list?limitPerPage=5&unknownParam=value&malicious=<script>');

      const response = await getPropertiesList(request);

      expect(response.status).toBe(200);
      expect(mockGetProperties).toHaveBeenCalledWith({
        limitPerPage: 5,
        lastDoc: null
      });
    });

    test('devrait gérer les URLs très longues', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const longCursor = 'a'.repeat(1000);
      const request = new NextRequest(`http://localhost:3000/api/property/list?lastDoc=${longCursor}`);

      const response = await getPropertiesList(request);

      expect(response.status).toBe(200);
      expect(mockGetProperties).toHaveBeenCalledWith({
        limitPerPage: 10,
        lastDoc: longCursor
      });
    });
  });

  describe('Monitoring et logging', () => {
    test('devrait logger les erreurs Redis', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRedis.get.mockRejectedValue(new Error('Redis GET error'));
      mockGetProperties.mockResolvedValue(mockPropertiesData);

      const request = new NextRequest('http://localhost:3000/api/property/list');
      await getPropertiesList(request);

      expect(consoleSpy).toHaveBeenCalledWith('Erreur Redis (GET list):', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('devrait logger les erreurs de base de données', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRedis.get.mockResolvedValue(null);
      mockGetProperties.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/property/list');
      await getPropertiesList(request);

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching properties:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('devrait logger les erreurs Redis SET', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error('Redis SET error'));
      mockGetProperties.mockResolvedValue(mockPropertiesData);

      const request = new NextRequest('http://localhost:3000/api/property/list');
      await getPropertiesList(request);

      expect(consoleSpy).toHaveBeenCalledWith('Erreur Redis (SET list):', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
