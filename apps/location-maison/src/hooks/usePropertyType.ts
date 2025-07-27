'use client'

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type PropertyType = 'home' | 'apartment' | 'villa' | 'studio' | 'building' | 'desk' | 'shop' | 'kiosk' | 'room' | 'land';

// Mapping des types avec leurs labels français
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
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

// Champs requis par type de propriété
export const PROPERTY_REQUIRED_FIELDS: Record<PropertyType, string[]> = {
  home: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'nombre de chambres', 
    'nombre de cuisines', 'nombre de salles de bain', 'nombre de toilettes', 
    'nombre de garages', 'nombre d\'étages', 'nombre de salons'
  ],
  apartment: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'nombre de chambres',
    'nombre de cuisines', 'nombre de salles de bain', 'nombre de toilettes',
    'numéro d\'étage', 'numéro d\'appartement'
  ],
  villa: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'nombre de chambres',
    'nombre de cuisines', 'nombre de salles de bain', 'nombre de toilettes',
    'nombre d\'étages', 'nombre de piscines', 'nombre de garages'
  ],
  studio: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'nombre de chambres',
    'nombre de cuisines', 'nombre de salles de bain', 'nombre de toilettes',
    'numéro d\'étage', 'numéro de studio'
  ],
  building: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'nombre d\'appartements',
    'nombre d\'étages', 'parking disponible (oui/non)'
  ],
  desk: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'nombre de toilettes',
    'nombre de pièces/salles'
  ],
  shop: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'nombre de pièces',
    'nombre de toilettes'
  ],
  kiosk: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'type de kiosque'
  ],
  room: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'type de chambre'
  ],
  land: [
    'titre', 'description', 'superficie (m²)', 'prix (FCFA)', 'type de terrain'
  ]
};

export const usePropertyType = () => {
  const pathname = usePathname();
  
  const propertyType = useMemo((): PropertyType | null => {
    // Extraire le type depuis l'URL : /property/add/home -> 'home'
    const pathSegments = pathname.split('/');
    const typeIndex = pathSegments.findIndex(segment => segment === 'add') + 1;
    
    if (typeIndex > 0 && typeIndex < pathSegments.length) {
      const detectedType = pathSegments[typeIndex] as PropertyType;
      
      // Vérifier que c'est un type valide
      if (Object.keys(PROPERTY_TYPE_LABELS).includes(detectedType)) {
        return detectedType;
      }
    }
    
    return null;
  }, [pathname]);
  
  const propertyLabel = propertyType ? PROPERTY_TYPE_LABELS[propertyType] : null;
  const requiredFields = propertyType ? PROPERTY_REQUIRED_FIELDS[propertyType] : [];
  
  return {
    propertyType,
    propertyLabel,
    requiredFields,
    isPropertyForm: propertyType !== null
  };
};

export default usePropertyType; 