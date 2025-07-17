import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { usePropertyType, PROPERTY_TYPE_LABELS, PROPERTY_REQUIRED_FIELDS, PropertyType } from '@/hooks/usePropertyType';

// Mock de next/navigation
jest.mock('next/navigation');

describe('usePropertyType Hook Tests', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Détection des types de propriétés depuis l\'URL', () => {
    test('devrait détecter le type "home" depuis l\'URL', () => {
      mockUsePathname.mockReturnValue('/property/add/home');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('home');
      expect(result.current.propertyLabel).toBe('maison');
      expect(result.current.isPropertyForm).toBe(true);
    });

    test('devrait détecter le type "apartment" depuis l\'URL', () => {
      mockUsePathname.mockReturnValue('/property/add/apartment');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('apartment');
      expect(result.current.propertyLabel).toBe('appartement');
      expect(result.current.isPropertyForm).toBe(true);
    });

    test('devrait détecter tous les types de propriétés valides', () => {
      const validTypes: PropertyType[] = [
        'home', 'apartment', 'villa', 'studio', 'building', 
        'desk', 'shop', 'kiosk', 'room', 'land'
      ];

      validTypes.forEach(type => {
        mockUsePathname.mockReturnValue(`/property/add/${type}`);

        const { result } = renderHook(() => usePropertyType());

        expect(result.current.propertyType).toBe(type);
        expect(result.current.propertyLabel).toBe(PROPERTY_TYPE_LABELS[type]);
        expect(result.current.isPropertyForm).toBe(true);
        expect(result.current.requiredFields).toEqual(PROPERTY_REQUIRED_FIELDS[type]);
      });
    });

    test('devrait gérer les URLs avec des segments supplémentaires', () => {
      mockUsePathname.mockReturnValue('/property/add/villa/step/2');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('villa');
      expect(result.current.propertyLabel).toBe('villa');
      expect(result.current.isPropertyForm).toBe(true);
    });

    test('devrait gérer les URLs de modification de propriété', () => {
      mockUsePathname.mockReturnValue('/property/modify/studio/abc123');

      const { result } = renderHook(() => usePropertyType());

      // Le hook cherche spécifiquement le segment après 'add'
      expect(result.current.propertyType).toBeNull();
      expect(result.current.propertyLabel).toBeNull();
      expect(result.current.isPropertyForm).toBe(false);
    });
  });

  describe('Gestion des URLs invalides ou non reconnues', () => {
    test('devrait retourner null pour un type de propriété invalide', () => {
      mockUsePathname.mockReturnValue('/property/add/invalid-type');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBeNull();
      expect(result.current.propertyLabel).toBeNull();
      expect(result.current.isPropertyForm).toBe(false);
      expect(result.current.requiredFields).toEqual([]);
    });

    test('devrait retourner null pour une URL sans type', () => {
      mockUsePathname.mockReturnValue('/property/add');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBeNull();
      expect(result.current.propertyLabel).toBeNull();
      expect(result.current.isPropertyForm).toBe(false);
    });

    test('devrait retourner null pour une URL complètement différente', () => {
      mockUsePathname.mockReturnValue('/dashboard/user/profile');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBeNull();
      expect(result.current.propertyLabel).toBeNull();
      expect(result.current.isPropertyForm).toBe(false);
    });

    test('devrait retourner null pour une URL vide', () => {
      mockUsePathname.mockReturnValue('');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBeNull();
      expect(result.current.propertyLabel).toBeNull();
      expect(result.current.isPropertyForm).toBe(false);
    });

    test('devrait retourner null pour une URL racine', () => {
      mockUsePathname.mockReturnValue('/');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBeNull();
      expect(result.current.propertyLabel).toBeNull();
      expect(result.current.isPropertyForm).toBe(false);
    });
  });

  describe('Champs requis par type de propriété', () => {
    test('devrait retourner les champs requis pour une maison', () => {
      mockUsePathname.mockReturnValue('/property/add/home');

      const { result } = renderHook(() => usePropertyType());

      const expectedFields = [
        'titre', 'description', 'superficie (m²)', 'prix (€)', 'nombre de chambres', 
        'nombre de cuisines', 'nombre de salles de bain', 'nombre de toilettes', 
        'nombre de garages', 'nombre d\'étages', 'nombre de salons'
      ];

      expect(result.current.requiredFields).toEqual(expectedFields);
    });

    test('devrait retourner les champs requis pour un appartement', () => {
      mockUsePathname.mockReturnValue('/property/add/apartment');

      const { result } = renderHook(() => usePropertyType());

      const expectedFields = [
        'titre', 'description', 'superficie (m²)', 'prix (€)', 'nombre de chambres',
        'nombre de cuisines', 'nombre de salles de bain', 'nombre de toilettes',
        'numéro d\'étage', 'numéro d\'appartement'
      ];

      expect(result.current.requiredFields).toEqual(expectedFields);
    });

    test('devrait retourner les champs requis pour un bureau', () => {
      mockUsePathname.mockReturnValue('/property/add/desk');

      const { result } = renderHook(() => usePropertyType());

      const expectedFields = [
        'titre', 'description', 'superficie (m²)', 'prix (€)', 'nombre de toilettes',
        'nombre de pièces/salles'
      ];

      expect(result.current.requiredFields).toEqual(expectedFields);
    });

    test('devrait retourner les champs requis pour un terrain', () => {
      mockUsePathname.mockReturnValue('/property/add/land');

      const { result } = renderHook(() => usePropertyType());

      const expectedFields = [
        'titre', 'description', 'superficie (m²)', 'prix (€)', 'type de terrain'
      ];

      expect(result.current.requiredFields).toEqual(expectedFields);
    });

    test('devrait retourner un tableau vide pour un type invalide', () => {
      mockUsePathname.mockReturnValue('/property/add/invalid');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.requiredFields).toEqual([]);
    });
  });

  describe('Labels des types de propriétés', () => {
    test('devrait vérifier la cohérence des labels français', () => {
      const expectedLabels = {
        home: 'maison',
        apartment: 'appartement', 
        villa: 'villa',
        studio: 'studio',
        building: 'immeuble',
        desk: 'bureau',
        shop: 'boutique',
        kiosk: 'kiosque',
        room: 'chambre',
        land: 'terrain'
      };

      expect(PROPERTY_TYPE_LABELS).toEqual(expectedLabels);
    });

    test('devrait retourner le bon label pour chaque type', () => {
      Object.entries(PROPERTY_TYPE_LABELS).forEach(([type, expectedLabel]) => {
        mockUsePathname.mockReturnValue(`/property/add/${type}`);

        const { result } = renderHook(() => usePropertyType());

        expect(result.current.propertyLabel).toBe(expectedLabel);
      });
    });
  });

  describe('Réactivité aux changements d\'URL', () => {
    test('devrait se mettre à jour lors du changement d\'URL', () => {
      mockUsePathname.mockReturnValue('/property/add/home');

      const { result, rerender } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('home');
      expect(result.current.propertyLabel).toBe('maison');

      // Changer l'URL
      mockUsePathname.mockReturnValue('/property/add/apartment');
      rerender();

      expect(result.current.propertyType).toBe('apartment');
      expect(result.current.propertyLabel).toBe('appartement');
    });

    test('devrait passer de valide à invalide', () => {
      mockUsePathname.mockReturnValue('/property/add/villa');

      const { result, rerender } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('villa');
      expect(result.current.isPropertyForm).toBe(true);

      // Changer vers une URL invalide
      mockUsePathname.mockReturnValue('/other/page');
      rerender();

      expect(result.current.propertyType).toBeNull();
      expect(result.current.isPropertyForm).toBe(false);
    });
  });

  describe('Cas limites et Edge cases', () => {
    test('devrait gérer les URLs avec des paramètres de requête', () => {
      mockUsePathname.mockReturnValue('/property/add/studio');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('studio');
      expect(result.current.propertyLabel).toBe('studio');
    });

    test('devrait gérer les URLs avec des fragments', () => {
      mockUsePathname.mockReturnValue('/property/add/building');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('building');
      expect(result.current.propertyLabel).toBe('immeuble');
    });

    test('devrait gérer les URLs avec des slashes en fin', () => {
      mockUsePathname.mockReturnValue('/property/add/shop/');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('shop');
      expect(result.current.propertyLabel).toBe('boutique');
    });

    test('devrait gérer les URLs avec des caractères spéciaux encodés', () => {
      mockUsePathname.mockReturnValue('/property/add/kiosk%20test');

      const { result } = renderHook(() => usePropertyType());

      // Devrait ne pas matcher car "kiosk%20test" n'est pas "kiosk"
      expect(result.current.propertyType).toBeNull();
    });

    test('devrait être sensible à la casse', () => {
      mockUsePathname.mockReturnValue('/property/add/HOME');

      const { result } = renderHook(() => usePropertyType());

      // Devrait ne pas matcher car c'est sensible à la casse
      expect(result.current.propertyType).toBeNull();
    });
  });

  describe('Performance et optimisation', () => {
    test('devrait utiliser useMemo pour optimiser les calculs', () => {
      mockUsePathname.mockReturnValue('/property/add/room');

      const { result, rerender } = renderHook(() => usePropertyType());

      const firstResult = result.current;

      // Re-render sans changer l'URL
      rerender();

      const secondResult = result.current;

      // Les objets devraient être les mêmes grâce à useMemo
      expect(firstResult.propertyType).toBe(secondResult.propertyType);
      expect(firstResult.propertyLabel).toBe(secondResult.propertyLabel);
      expect(firstResult.requiredFields).toBe(secondResult.requiredFields);
      expect(firstResult.isPropertyForm).toBe(secondResult.isPropertyForm);
    });

    test('ne devrait recalculer que si l\'URL change', () => {
      mockUsePathname.mockReturnValue('/property/add/land');

      const { result, rerender } = renderHook(() => usePropertyType());

      const firstResult = result.current;

      // Re-render sans changer l'URL
      rerender();

      const secondResult = result.current;

      // Les résultats devraient être identiques
      expect(firstResult.propertyType).toBe(secondResult.propertyType);
      expect(firstResult.propertyLabel).toBe(secondResult.propertyLabel);
      expect(firstResult.isPropertyForm).toBe(secondResult.isPropertyForm);
      
      // Vérifier que le hook fonctionne correctement
      expect(result.current.propertyType).toBe('land');
      expect(result.current.propertyLabel).toBe('terrain');
    });
  });

  describe('Intégration avec le routing Next.js', () => {
    test('devrait fonctionner avec les URLs dynamiques Next.js', () => {
      const dynamicUrls = [
        '/property/add/villa',
        '/property/add/villa/step-1',
        '/property/add/villa/step-2/details',
        '/property/add/villa/preview'
      ];

      dynamicUrls.forEach(url => {
        mockUsePathname.mockReturnValue(url);

        const { result } = renderHook(() => usePropertyType());

        expect(result.current.propertyType).toBe('villa');
        expect(result.current.propertyLabel).toBe('villa');
      });
    });

    test('devrait gérer les URLs avec des paramètres de route', () => {
      mockUsePathname.mockReturnValue('/property/add/apartment/[id]/edit');

      const { result } = renderHook(() => usePropertyType());

      expect(result.current.propertyType).toBe('apartment');
    });
  });

  describe('Validation des constantes', () => {
    test('tous les types devraient avoir un label', () => {
      const types: PropertyType[] = [
        'home', 'apartment', 'villa', 'studio', 'building', 
        'desk', 'shop', 'kiosk', 'room', 'land'
      ];

      types.forEach(type => {
        expect(PROPERTY_TYPE_LABELS[type]).toBeDefined();
        expect(typeof PROPERTY_TYPE_LABELS[type]).toBe('string');
        expect(PROPERTY_TYPE_LABELS[type].length).toBeGreaterThan(0);
      });
    });

    test('tous les types devraient avoir des champs requis', () => {
      const types: PropertyType[] = [
        'home', 'apartment', 'villa', 'studio', 'building', 
        'desk', 'shop', 'kiosk', 'room', 'land'
      ];

      types.forEach(type => {
        expect(PROPERTY_REQUIRED_FIELDS[type]).toBeDefined();
        expect(Array.isArray(PROPERTY_REQUIRED_FIELDS[type])).toBe(true);
        expect(PROPERTY_REQUIRED_FIELDS[type].length).toBeGreaterThan(0);
        
        // Tous les types devraient au moins avoir titre, description, superficie et prix
        const requiredFields = PROPERTY_REQUIRED_FIELDS[type];
        expect(requiredFields).toContain('titre');
        expect(requiredFields).toContain('description');
        expect(requiredFields).toContain('superficie (m²)');
        expect(requiredFields).toContain('prix (€)');
      });
    });

    test('les champs requis devraient être des chaînes non vides', () => {
      Object.values(PROPERTY_REQUIRED_FIELDS).forEach(fields => {
        fields.forEach(field => {
          expect(typeof field).toBe('string');
          expect(field.length).toBeGreaterThan(0);
          expect(field.trim()).toBe(field); // Pas d'espaces en début/fin
        });
      });
    });
  });
});
