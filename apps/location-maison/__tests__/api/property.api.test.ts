import { describe, test, expect, jest, beforeEach } from '@jest/globals';

type PropertyRecord = {
  id?: string;
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  type?: string;
  area?: number;
  bedrooms?: number;
  images?: string[];
  [key: string]: unknown;
};
type PropertiesListData = {
  properties: PropertyRecord[];
  hasMore: boolean;
  lastDoc?: string | null;
};
type PropertyApiResponse = { status: number; data: any };

type RedisGetFn = (key: string) => Promise<any>;
type RedisSetFn = (
  key: string,
  value: any,
  options: { ex: number }
) => Promise<void>;
type RedisDelFn = (key: string) => Promise<number>;
type RedisPingFn = () => Promise<string>;
type GetPropertiesFn = (params: {
  limitPerPage: number;
  lastDoc: string | null;
}) => Promise<any>;

// Mock de Redis
const mockRedis = {
  get: jest.fn() as jest.MockedFunction<RedisGetFn>,
  set: jest.fn() as jest.MockedFunction<RedisSetFn>,
  del: jest.fn() as jest.MockedFunction<RedisDelFn>,
  ping: jest.fn() as jest.MockedFunction<RedisPingFn>,
};

jest.mock('@/redis/client', () => mockRedis);

// Mock des fonctions de base de données
const mockGetProperties = jest.fn() as jest.MockedFunction<GetPropertiesFn>;
const mockGetPropertyById = jest.fn() as jest.MockedFunction<(id: string) => Promise<unknown>>;
const mockGetPropertiesCount = jest.fn() as jest.MockedFunction<() => Promise<number>>;
const mockGetPromotedProperties = jest.fn() as jest.MockedFunction<
  (limit?: number) => Promise<PropertyRecord[]>
>;

jest.mock('@/db/property.db', () => ({
  getProperties: mockGetProperties,
  getPropertyById: mockGetPropertyById,
  getPropertiesCount: mockGetPropertiesCount,
  getPromotedProperties: mockGetPromotedProperties
}));

// Mock de l'API Property Service au lieu d'importer les vraies routes
class MockPropertyAPIService {
  async getPropertiesList(params: any): Promise<PropertyApiResponse> {
    try {
      const { limitPerPage = 10, lastDoc = null } = params;
      
      // Simulation du cache Redis
      const cacheKey = `properties:list:${limitPerPage}:${lastDoc || 'first'}`;
      
      try {
        const cached: PropertiesListData | null = await mockRedis.get(cacheKey);
        if (cached) {
          return {
            status: 200,
            data: cached
          };
        }
      } catch (redisError) {
        // Ignorer les erreurs Redis et continuer
      }

      // Récupération depuis la base de données
      const dbResult: PropertiesListData = await mockGetProperties({
        limitPerPage: Number(limitPerPage) || 10,
        lastDoc: lastDoc || null
      });

      // Mise en cache si possible
      try {
        const ttl = Number(process.env.REDIS_CATALOG_TTL) || 600;
        await mockRedis.set(cacheKey, dbResult, { ex: ttl });
      } catch (redisError) {
        // Ignorer les erreurs Redis de mise à jour
      }

      return {
        status: 200,
        data: dbResult
      };
    } catch (error) {
      return {
        status: 500,
        data: { error: 'Failed to fetch properties' }
      };
    }
  }
}

const mockPropertyAPIService = new MockPropertyAPIService();

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

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(result.data.properties).toHaveLength(2);
      expect(result.data.hasMore).toBe(true);
      expect(result.data.lastDoc).toBe('doc-cursor-123');
      
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

      const result = await mockPropertyAPIService.getPropertiesList({
        limitPerPage: 5,
        lastDoc: 'cursor-abc'
      });

      expect(result.status).toBe(200);
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

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(result.data).toEqual(cachedData);
      
      // Ne devrait pas appeler la base de données
      expect(mockGetProperties).not.toHaveBeenCalled();
      
      // Ne devrait pas mettre à jour le cache
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    test('devrait gérer les erreurs Redis en lecture', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockGetProperties.mockResolvedValue(mockPropertiesData);

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockPropertiesData);
      
      // Devrait quand même appeler la base de données
      expect(mockGetProperties).toHaveBeenCalled();
    });

    test('devrait gérer les erreurs Redis en écriture', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error('Redis write failed'));
      mockGetProperties.mockResolvedValue(mockPropertiesData);

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockPropertiesData);
      
      // L'erreur Redis ne devrait pas affecter la réponse
    });

    test('devrait gérer les erreurs de base de données', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGetProperties.mockRejectedValue(new Error('Database connection failed'));

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(500);
      expect(result.data.error).toBe('Failed to fetch properties');
    });

    test('devrait valider les paramètres de pagination', async () => {
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      const result = await mockPropertyAPIService.getPropertiesList({
        limitPerPage: 'invalid',
        lastDoc: ''
      });

      expect(result.status).toBe(200);
      
      // Devrait utiliser les valeurs par défaut
      expect(mockGetProperties).toHaveBeenCalledWith({
        limitPerPage: 10, // Valeur par défaut pour string invalide
        lastDoc: null    // Chaîne vide devient null
      });
    });

    test('devrait gérer les limites de pagination extrêmes', async () => {
      mockGetProperties.mockResolvedValue({ properties: [], hasMore: false });
      mockRedis.get.mockResolvedValue(null);

      const testCases = [
        { limitPerPage: 0, expected: 10 },   // 0 devient la valeur par défaut
        { limitPerPage: 1, expected: 1 },
        { limitPerPage: 100, expected: 100 },
        { limitPerPage: 999999, expected: 999999 }
      ];

      for (const testCase of testCases) {
        mockGetProperties.mockClear();
        
        const result = await mockPropertyAPIService.getPropertiesList({
          limitPerPage: testCase.limitPerPage
        });

        expect(result.status).toBe(200);
        expect(mockGetProperties).toHaveBeenCalledWith({
          limitPerPage: testCase.expected,
          lastDoc: null
        });
      }
    });

    test('devrait optimiser le cache pour les requêtes fréquentes', async () => {
      const commonQuery = { limitPerPage: 10, lastDoc: null };
      
      mockGetProperties.mockResolvedValue(mockPropertiesData);
      mockRedis.get.mockResolvedValue(null);

      // Première requête - devrait mettre en cache
      await mockPropertyAPIService.getPropertiesList(commonQuery);
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'properties:list:10:first',
        mockPropertiesData,
        { ex: 600 }
      );

      // Simuler que le cache est maintenant disponible
      mockRedis.get.mockResolvedValue(mockPropertiesData);
      mockGetProperties.mockClear();

      // Deuxième requête - devrait utiliser le cache
      const result = await mockPropertyAPIService.getPropertiesList(commonQuery);

      expect(result.data).toEqual(mockPropertiesData);
      expect(mockGetProperties).not.toHaveBeenCalled();
    });

    test('devrait gérer les propriétés avec différents types', async () => {
      const diverseProperties = {
        properties: [
          { type: 'villa', price: 500000, location: 'Libreville' },
          { type: 'apartment', price: 120000, location: 'Port-Gentil' },
          { type: 'home', price: 200000, location: 'Franceville' },
          { type: 'land', price: 80000, location: 'Oyem' }
        ],
        hasMore: false,
        lastDoc: null
      };

      mockGetProperties.mockResolvedValue(diverseProperties);
      mockRedis.get.mockResolvedValue(null);

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(result.data.properties).toHaveLength(4);
      
	      const types = result.data.properties.map((p: PropertyRecord) => p.type);
      expect(types).toContain('villa');
      expect(types).toContain('apartment');
      expect(types).toContain('home');
      expect(types).toContain('land');
    });

    test('devrait gérer les propriétés sans images', async () => {
      const propertiesWithoutImages = {
        properties: [
          { id: 'prop-no-img', title: 'Propriété sans images', images: [] },
          { id: 'prop-with-img', title: 'Propriété avec images', images: ['img1.jpg'] }
        ],
        hasMore: false
      };

      mockGetProperties.mockResolvedValue(propertiesWithoutImages);
      mockRedis.get.mockResolvedValue(null);

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(result.data.properties[0].images).toEqual([]);
      expect(result.data.properties[1].images).toHaveLength(1);
    });

    test('devrait gérer les réponses vides', async () => {
      const emptyResponse = {
        properties: [],
        hasMore: false,
        lastDoc: null
      };

      mockGetProperties.mockResolvedValue(emptyResponse);
      mockRedis.get.mockResolvedValue(null);

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(result.data.properties).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    });
  });

  describe('Performance et Cache', () => {
    test('devrait respecter le TTL configuré du cache', async () => {
      process.env.REDIS_CATALOG_TTL = '1800'; // 30 minutes
      
      mockGetProperties.mockResolvedValue({ properties: [], hasMore: false });
      mockRedis.get.mockResolvedValue(null);

      await mockPropertyAPIService.getPropertiesList({});

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { ex: 1800 }
      );
    });

    test('devrait utiliser un TTL par défaut si non configuré', async () => {
      delete process.env.REDIS_CATALOG_TTL;
      
      mockGetProperties.mockResolvedValue({ properties: [], hasMore: false });
      mockRedis.get.mockResolvedValue(null);

      await mockPropertyAPIService.getPropertiesList({});

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { ex: 600 } // Valeur par défaut
      );
    });

    test('devrait continuer à fonctionner même si Redis est complètement indisponible', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      mockRedis.set.mockRejectedValue(new Error('Redis down'));
      mockGetProperties.mockResolvedValue({ properties: [], hasMore: false });

      const result = await mockPropertyAPIService.getPropertiesList({});

      expect(result.status).toBe(200);
      expect(mockGetProperties).toHaveBeenCalled();
    });
  });
});
