/**
 * Factory pour la création de mocks Property
 * Utilise le pattern Factory pour générer des données de test cohérentes
 */

import { Timestamp } from 'firebase/firestore';

// Types
type PropertyType = 'HOME' | 'APARTMENT' | 'STUDIO' | 'VILLA' | 'BUILDING' | 'DESK' | 'SHOP' | 'KIOSK' | 'ROOM' | 'LAND';
type PropertyStatus = 'FOR_RENT' | 'FOR_SALE';
type EntityState = 'IN_PROGRESS' | 'ARCHIVED';
type PromotionType = 'FEATURED' | 'TRENDING_7D' | 'TRENDING_3D' | 'BOOST';

interface Image {
  filePath: string;
  fileUrl: string;
}

interface Promotion {
  type: PromotionType;
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  creditsUsed: number;
}

interface Property {
  id: string;
  propertyType: PropertyType;
  images: Image[];
  title: string;
  description: string;
  areaSquareMeters: number;
  priceXAF: number;
  tags: string[];
  createdBy: string;
  status: PropertyStatus;
  contactPhone?: string;
  currentPromotion?: Promotion;
  promotionHistory: Promotion[];
  lastBoostedAt?: Timestamp;
  isPromoted: boolean;
  // Location
  street: string;
  city: string;
  province: string;
  additionalInfo?: string;
  longitude: number;
  latitude: number;
  country: string;
  countryCode: string;
  isLocationExact: boolean;
  // Metadata
  state: EntityState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  searchableName: string;
  // Dwelling specific
  numberOfRooms?: number;
  numberOfKitchens?: number;
  numberOfBathrooms?: number;
  numberOfToilets?: number;
  // Apartment/Studio specific
  floorNumber?: number;
  apartmentNumber?: string;
  studioNumber?: string;
  // Home specific
  numberOfFloors?: number;
  numberOfGarages?: number;
  numberOfLivingRooms?: number;
  // Villa specific
  numberOfPools?: number;
  // Building specific
  numberOfApartments?: number;
  hasParking?: boolean;
}

/**
 * Factory pour créer des propriétés de test
 */
export class PropertyFactory {
  private static counter = 0;

  /**
   * Réinitialise le compteur
   */
  static reset(): void {
    this.counter = 0;
  }

  /**
   * Crée une propriété de base
   */
  static create(overrides: Partial<Property> = {}): Property {
    this.counter++;
    const now = Timestamp.now();

    return {
      id: `property-${this.counter}`,
      propertyType: 'APARTMENT',
      images: [this.createImage()],
      title: `Propriété de test ${this.counter}`,
      description: `Description de la propriété de test ${this.counter}`,
      areaSquareMeters: 80,
      priceXAF: 300000,
      tags: ['wifi', 'parking'],
      createdBy: 'user-1',
      status: 'FOR_RENT',
      promotionHistory: [],
      isPromoted: false,
      // Location
      street: 'Rue du Test',
      city: 'Libreville',
      province: 'Estuaire',
      longitude: 9.45,
      latitude: 0.39,
      country: 'Gabon',
      countryCode: 'GA',
      isLocationExact: false,
      // Metadata
      state: 'IN_PROGRESS',
      createdAt: now,
      updatedAt: now,
      searchableName: `propriété test ${this.counter}`,
      ...overrides,
    };
  }

  /**
   * Crée un appartement
   */
  static createApartment(overrides: Partial<Property> = {}): Property {
    return this.create({
      propertyType: 'APARTMENT',
      title: `Appartement moderne ${this.counter}`,
      numberOfRooms: 3,
      numberOfKitchens: 1,
      numberOfBathrooms: 1,
      numberOfToilets: 1,
      floorNumber: 2,
      apartmentNumber: `A${this.counter}`,
      ...overrides,
    });
  }

  /**
   * Crée une maison
   */
  static createHome(overrides: Partial<Property> = {}): Property {
    return this.create({
      propertyType: 'HOME',
      title: `Maison familiale ${this.counter}`,
      areaSquareMeters: 150,
      priceXAF: 500000,
      numberOfRooms: 4,
      numberOfKitchens: 1,
      numberOfBathrooms: 2,
      numberOfToilets: 2,
      numberOfFloors: 1,
      numberOfGarages: 1,
      numberOfLivingRooms: 1,
      ...overrides,
    });
  }

  /**
   * Crée une villa
   */
  static createVilla(overrides: Partial<Property> = {}): Property {
    return this.create({
      propertyType: 'VILLA',
      title: `Villa de luxe ${this.counter}`,
      areaSquareMeters: 300,
      priceXAF: 2000000,
      numberOfRooms: 5,
      numberOfKitchens: 2,
      numberOfBathrooms: 3,
      numberOfToilets: 4,
      numberOfFloors: 2,
      numberOfGarages: 2,
      numberOfLivingRooms: 2,
      numberOfPools: 1,
      tags: ['piscine', 'jardin', 'sécurité', 'luxe'],
      ...overrides,
    });
  }

  /**
   * Crée un studio
   */
  static createStudio(overrides: Partial<Property> = {}): Property {
    return this.create({
      propertyType: 'STUDIO',
      title: `Studio cosy ${this.counter}`,
      areaSquareMeters: 25,
      priceXAF: 120000,
      numberOfRooms: 1,
      numberOfKitchens: 1,
      numberOfBathrooms: 1,
      numberOfToilets: 1,
      floorNumber: 1,
      studioNumber: `S${this.counter}`,
      tags: ['étudiant', 'meublé'],
      ...overrides,
    });
  }

  /**
   * Crée un terrain
   */
  static createLand(overrides: Partial<Property> = {}): Property {
    return this.create({
      propertyType: 'LAND',
      title: `Terrain constructible ${this.counter}`,
      areaSquareMeters: 500,
      priceXAF: 15000000,
      status: 'FOR_SALE',
      tags: ['constructible', 'viabilisé'],
      ...overrides,
    });
  }

  /**
   * Crée une propriété promue
   */
  static createPromoted(type: PromotionType = 'FEATURED', overrides: Partial<Property> = {}): Property {
    const now = Timestamp.now();
    const endDate = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // +7 jours

    const promotion: Promotion = {
      type,
      startDate: now,
      endDate,
      isActive: true,
      creditsUsed: type === 'FEATURED' ? 10 : type === 'TRENDING_7D' ? 7 : type === 'TRENDING_3D' ? 4 : 2,
    };

    return this.create({
      isPromoted: true,
      currentPromotion: promotion,
      promotionHistory: [promotion],
      ...overrides,
    });
  }

  /**
   * Crée une image mock
   */
  static createImage(index: number = 1): Image {
    return {
      filePath: `properties/property-${this.counter}/image-${index}.jpg`,
      fileUrl: `https://storage.example.com/properties/property-${this.counter}/image-${index}.jpg`,
    };
  }

  /**
   * Crée plusieurs images
   */
  static createImages(count: number): Image[] {
    return Array.from({ length: count }, (_, i) => this.createImage(i + 1));
  }

  /**
   * Crée un lot de propriétés
   */
  static createBatch(count: number, overrides: Partial<Property> = {}): Property[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Crée un lot de propriétés variées
   */
  static createMixedBatch(): Property[] {
    return [
      this.createApartment(),
      this.createHome(),
      this.createVilla(),
      this.createStudio(),
      this.createLand(),
    ];
  }
}

export default PropertyFactory;

