/**
 * Mappers pour transformer les données JSON vers le format Firestore
 */

import { StatusProperty, TypeProperty, Property, Image, Location, Home, Apartment, Studio, Building, Desk, Shop, Villa, Room, Kiosk, Land } from './types/annonce';
import { Timestamp } from 'firebase-admin/firestore';
import { CONFIG } from './config';

/**
 * Normalise un numéro de téléphone gabonais
 * - Supprime les espaces, tirets, et préfixes comme "whatsapp:"
 * - Vérifie si le numéro commence déjà par +241 ou 241
 * - Ajoute +241 seulement si nécessaire
 */
function normalizePhone(phone: string): string {
  // Nettoyer le numéro : supprimer les espaces, tirets, et préfixes
  let cleanPhone = phone
    .replace(/^(whatsapp:|tel:|contact:|phone:)/i, '') // Supprimer les préfixes
    .replace(/[\s\-\(\)]/g, '') // Supprimer espaces, tirets, parenthèses
    .trim();

  // Si le numéro commence déjà par +241, le retourner tel quel
  if (cleanPhone.startsWith('+241')) {
    return cleanPhone;
  }

  // Si le numéro commence par 241 (sans le +), ajouter le +
  if (cleanPhone.startsWith('241')) {
    return `+${cleanPhone}`;
  }

  // Sinon, ajouter le préfixe +241
  return `+241${cleanPhone}`;
}

/**
 * Nettoie le titre d'une annonce
 * Supprime les informations de prix et de contact qui peuvent être présentes
 */
export function cleanTitle(title: string): string {
  // Supprimer tout ce qui suit "Prix:" jusqu'à la fin
  const withoutPrice = title.replace(/\s*Prix\s*:.*$/i, '');
  
  // Supprimer tout ce qui suit "Contact:" jusqu'à la fin
  const withoutContact = withoutPrice.replace(/\s*Contact\s*:.*$/i, '');
  
  // Supprimer les tirets et espaces en trop à la fin
  const cleaned = withoutContact.replace(/[\s\-]+$/, '');
  
  return cleaned.trim();
}

// Types pour les données JSON d'entrée
export interface BienJSON {
  titre: string;
  date: string;
  contacts: string[];
  description: string;
  caracteristiques: {
    nombre_chambres: number;
    nombre_salles_bain: number;
    nombre_toilettes: number;
    etage: number;
    numero_appartement: string;
    nombre_appartements: number;
    nombre_etages: number;
    parking_disponible: boolean;
    nombre_garages: number;
    nombre_salons: number;
    nombre_bureaux: number;
    nombre_pieces: number;
    type_chambre: string;
    superficie: number;
  };
  localisation: string;
  photos: string[];
  url: string;
  type_bien: string;
  id: string;
  statut: string;
  prix: number;
  tags: string[];
  localPhotos: string[];
}

export interface LocationJSON {
  original: {
    original: string;
    parsed: {
      city: string;
      district: string;
      street: string | null;
      additional: string[];
    };
  };
  photon: {
    coordinates: [number, number];
    country: string;
    province: string;
    city: string | null;
    district: string | null;
    street: string | null;
    confidence: number;
  };
}

/**
 * Mapper pour les types de propriétés
 */
export const typePropertyMapper: Record<string, TypeProperty> = {
  "Maison": "Home",
  "Appartement": "Apartment", 
  "Studio": "Studio",
  "Bureau": "Desk",
  "Magasin": "Shop",
  "Boutique": "Shop",
  "Terrain": "Land",
  "Villa": "Home",
  "Chambre": "Room",
  "Kiosque": "Kiosk",
  "Immeuble": "Building",
  "Duplex": "Home"
};

/**
 * Mapper pour les statuts
 */
export const statusMapper: Record<string, StatusProperty> = {
  "à louer": "FOR_RENT",
  "à vendre": "FOR_SALE"
};

/**
 * Mapper pour les tags - normalise les tags
 */
export const tagMapper: Record<string, string> = {
  "Famille": "Famille",
  "Parking": "Parking",
  "Sécurisé": "Sécurisé",
  "Travail": "Bureau",
  "Moderne": "Moderne",
  "Neuf": "Neuf",
  "Meublé": "Meublé",
  "Climatisé": "Climatisé"
};

/**
 * Enrichit automatiquement les tags basés sur le type_bien et les caractéristiques
 */
function enrichTagsFromProperty(bien: BienJSON, existingTags: string[]): string[] {
  const enrichedTags = [...existingTags];
  
  // Ajouter "Boutique" si le type_bien correspond à un magasin
  if (bien.type_bien === "Magasin" && !enrichedTags.includes("Boutique")) {
    enrichedTags.push("Boutique");
  }
  
  // Ajouter "Duplex" si le type_bien correspond à un duplex
  if (bien.type_bien === "Duplex" && !enrichedTags.includes("Duplex")) {
    enrichedTags.push("Duplex");
  }
  
  // Ajouter "Balcon" si la propriété a un balcon (basé sur la description ou caractéristiques)
  if (!enrichedTags.includes("Balcon")) {
    const hasBalcon = bien.description.toLowerCase().includes("balcon") || 
                     bien.titre.toLowerCase().includes("balcon");
    if (hasBalcon) {
      enrichedTags.push("Balcon");
    }
  }
  
  // Ajouter "Terrasse" si la propriété a une terrasse (basé sur la description ou caractéristiques)
  if (!enrichedTags.includes("Terrasse")) {
    const hasTerrasse = bien.description.toLowerCase().includes("terrasse") || 
                        bien.titre.toLowerCase().includes("terrasse");
    if (hasTerrasse) {
      enrichedTags.push("Terrasse");
    }
  }
  
  return enrichedTags;
}

/**
 * Mappe les données de base communes à toutes les propriétés
 */
export function mapBaseProperty(bien: BienJSON, location: Location, images: Image[]): Partial<Property> {
  const mappedType = typePropertyMapper[bien.type_bien];
  const mappedStatus = statusMapper[bien.statut];
  
  if (!mappedType || !mappedStatus) {
    throw new Error(`Type de propriété ou statut non supporté: ${bien.type_bien} / ${bien.statut}`);
  }

  // Mapper les tags existants
  const mappedTags = bien.tags.map(tag => tagMapper[tag] || tag);
  
  // Enrichir les tags avec les tags automatiques
  const enrichedTags = enrichTagsFromProperty(bien, mappedTags);

  // Construire l'objet de base sans les valeurs undefined
  const baseObj: any = {
    ...location,
    typeProperty: mappedType,
    images,
    title: cleanTitle(bien.titre),
    description: bien.description,
    area: bien.caracteristiques.superficie || 0,
    price: bien.prix,
    tags: enrichedTags,
    status: mappedStatus,
    createdBy: CONFIG.DEFAULT_CREATED_BY, // UID centralisé dans config.ts
    
    // Propriétés ICreation (sans id car Firebase le génère automatiquement)
    createdAt: parseDate(bien.date),
    updatedAt: parseDate(bien.date),
    searchableName: cleanTitle(bien.titre).toLowerCase(),
    state: CONFIG.DEFAULT_STATE, // État centralisé dans config.ts
    
    // Propriétés promotions - utiliser null au lieu de undefined
    promotionHistory: [],
    isPromoted: false
  };

  // Ajouter le contact seulement s'il existe avec normalisation du numéro
  if (bien.contacts[0]) {
    baseObj.contact = normalizePhone(bien.contacts[0]);
  }

  return baseObj;
}

/**
 * Mappe spécifiquement vers une Maison (Home)
 */
export function mapToHome(bien: BienJSON, location: Location, images: Image[]): Home {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Home',
    nbrRooms: bien.caracteristiques.nombre_chambres,
    nbrChickens: bien.caracteristiques.nombre_chambres, // Alias pour compatibilité
    nbrBathrooms: bien.caracteristiques.nombre_salles_bain,
    nbrToilets: bien.caracteristiques.nombre_toilettes,
    nbrFloors: bien.caracteristiques.etage || 1,
    nbrGarages: bien.caracteristiques.nombre_garages,
    nbrLivingRoom: bien.caracteristiques.nombre_salons
  } as Home;
}

/**
 * Mappe spécifiquement vers un Appartement
 */
export function mapToApartment(bien: BienJSON, location: Location, images: Image[]): Apartment {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Apartment',
    nbrRooms: bien.caracteristiques.nombre_chambres,
    nbrChickens: bien.caracteristiques.nombre_chambres,
    nbrBathrooms: bien.caracteristiques.nombre_salles_bain,
    nbrToilets: bien.caracteristiques.nombre_toilettes,
    nbrFloorApartment: bien.caracteristiques.etage || 1,
    numeroApartment: bien.caracteristiques.numero_appartement || 'Non précisé'
  } as Apartment;
}

/**
 * Mappe spécifiquement vers un Studio
 */
export function mapToStudio(bien: BienJSON, location: Location, images: Image[]): Studio {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Studio',
    nbrRooms: bien.caracteristiques.nombre_chambres || 1,
    nbrChickens: bien.caracteristiques.nombre_chambres || 1,
    nbrBathrooms: bien.caracteristiques.nombre_salles_bain || 1,
    nbrToilets: bien.caracteristiques.nombre_toilettes || 1,
    nbrFloorStudio: bien.caracteristiques.etage || 1,
    numeroStudio: bien.caracteristiques.numero_appartement || 'Non précisé'
  } as Studio;
}

/**
 * Mappe spécifiquement vers un Immeuble
 */
export function mapToBuilding(bien: BienJSON, location: Location, images: Image[]): Building {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Building',
    nbrApartments: bien.caracteristiques.nombre_appartements || 1,
    nbrFloors: bien.caracteristiques.nombre_etages || 1,
    hasParking: bien.caracteristiques.parking_disponible || false
  } as Building;
}

/**
 * Mappe spécifiquement vers un Bureau
 */
export function mapToDesk(bien: BienJSON, location: Location, images: Image[]): Desk {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Desk',
    nbrToilets: bien.caracteristiques.nombre_toilettes || 1,
    nbrRooms: bien.caracteristiques.nombre_bureaux || bien.caracteristiques.nombre_pieces || 1
  } as Desk;
}

/**
 * Mappe spécifiquement vers un Magasin
 */
export function mapToShop(bien: BienJSON, location: Location, images: Image[]): Shop {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Shop',
    nbrRooms: bien.caracteristiques.nombre_pieces || 1,
    nbrToilet: bien.caracteristiques.nombre_toilettes || 1
  } as Shop;
}

/**
 * Mappe spécifiquement vers un Terrain
 */
export function mapToLand(bien: BienJSON, location: Location, images: Image[]): Land {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Land',
    landType: 'Standard' // Type de terrain par défaut
  } as Land;
}

/**
 * Mappe spécifiquement vers une Chambre
 */
export function mapToRoom(bien: BienJSON, location: Location, images: Image[]): Room {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Room',
    roomType: bien.caracteristiques.type_chambre || 'Standard'
  } as Room;
}

/**
 * Mappe spécifiquement vers un Kiosque
 */
export function mapToKiosk(bien: BienJSON, location: Location, images: Image[]): Kiosk {
  const baseProperty = mapBaseProperty(bien, location, images);
  
  return {
    ...baseProperty,
    typeProperty: 'Kiosk',
    kioskType: 'Standard' // Par défaut
  } as Kiosk;
}

/**
 * Mapper principal - route vers le bon mapper selon le type
 */
export function mapPropertyByType(bien: BienJSON, location: Location, images: Image[]): Property {
  const typeProperty = typePropertyMapper[bien.type_bien];
  
  switch (typeProperty) {
    case 'Home':
      return mapToHome(bien, location, images);
    case 'Apartment':
      return mapToApartment(bien, location, images);
    case 'Studio':
      return mapToStudio(bien, location, images);
    case 'Building':
      return mapToBuilding(bien, location, images);
    case 'Desk':
      return mapToDesk(bien, location, images);
    case 'Shop':
      return mapToShop(bien, location, images);
    case 'Land':
      return mapToLand(bien, location, images);
    case 'Room':
      return mapToRoom(bien, location, images);
    case 'Kiosk':
      return mapToKiosk(bien, location, images);
    // Note: Villa est maintenant mappé vers Home, donc pas besoin de case Villa
    default:
      throw new Error(`Type de propriété non supporté: ${bien.type_bien}`);
  }
}

/**
 * Parse une date depuis le format "Publié le 15 juin 2025"
 */
function parseDate(dateString: string): Timestamp {
  try {
    // Extraction de la date depuis "Publié le 15 juin 2025"
    const dateMatch = dateString.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (!dateMatch) {
      return Timestamp.now();
    }

    const [, day, month, year] = dateMatch;
    
    // Vérification que les variables existent
    if (!day || !month || !year) {
      return Timestamp.now();
    }

    const monthNames: Record<string, number> = {
      'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
      'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };

    const monthIndex = monthNames[month.toLowerCase()];
    if (monthIndex === undefined) {
      return Timestamp.now();
    }

    const date = new Date(parseInt(year), monthIndex, parseInt(day));
    return Timestamp.fromDate(date);
  } catch (error) {
    console.warn(`Erreur lors du parsing de la date: ${dateString}`, error);
    return Timestamp.now();
  }
} 