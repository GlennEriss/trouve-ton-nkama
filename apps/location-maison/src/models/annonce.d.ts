/**
 * @module annonce
 */

import { ICreation } from "./creation";
import type { TagName } from '@/constantes'
import { Timestamp } from "firebase/firestore";
// Transitoire : ré-exports depuis @trouve-ton-nkama/core, source unique désormais partagée
// avec apps/location-maison-admin.
import type { TypePropertyKey, ModerationStatus as CoreModerationStatus } from "@trouve-ton-nkama/core/domain";

//Property
export type TypeProperty = TypePropertyKey;
export type StatusProperty = "FOR_RENT" | "FOR_SALE"
export type ModerationStatus = CoreModerationStatus

// Types pour les promotions
export type PromotionType = 'featured' | 'trending-7d' | 'trending-3d' | 'boost' | null;

export type Promotion = {
  type: PromotionType;
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  creditsUsed: number;
}

export type Image = {
    filePATH: string,
    fileURL: string,
    thumbPATH?: string,
    thumbURL?: string,
}

export type Property = Location & ICreation & {
    typeProperty: TypeProperty
    images: Image[]
    title: string,
    description: string,
    area: number,
    price: number,
    tags: TagName[],
    createdBy?: string,
    status: StatusProperty,
    contact?: string //Propriété tampon
    isOwner?: boolean

    // Modération avant publication : distinct de `state` (ICreation), qui gère
    // l'archivage par le propriétaire, pas la review admin.
    moderationStatus: ModerationStatus
    rejectionReason?: string
    moderationReviewedAt?: Timestamp
    moderationReviewedBy?: string

    // Nouvelles propriétés pour les promotions
    currentPromotion?: Promotion;
    promotionHistory?: Promotion[];
    lastBoostedAt?: Timestamp; // Pour le boost simple
    isPromoted?: boolean; // Indicateur rapide pour les requêtes
}

export type Location = {
    street: string,
    city: string,
    province: string,
    additionnalInformation?: string
    longitude: number,
    latitude: number,
    country: string,
    countryCode: string,
    isLocExact?: boolean
}
export type Logement = Property & {
    nbrRooms: number,
    nbrKitchens: number,
    nbrBathrooms: number,
    nbrToilets: number
}

export type Apartment = Logement & {
    nbrFloorApartment: number,
    numeroApartment: string
}

export type Building = Property & {
    nbrApartments: number,
    nbrFloors: number,
    hasParking: boolean
}

export type Desk = Property & {
    nbrToilets: number,
    nbrRooms: number
}

export type Home = Logement & {
    nbrFloors: number,
    nbrGarages: number,
    nbrLivingRoom?: number
}

export type Studio = Logement & {
    nbrFloorStudio: number,
    numeroStudio: string
}

export type Villa = Home & {
    nbrPiscine: number
}

export type Shop = Property & {
    nbrRooms: number;
    nbrToilet: number;
}

export type Kiosk = Property & {
    kioskType: string;
}

export type Room = Property & {
    roomType: string;
}

export type Duplex = Home

export type Warehouse = Property & {
    nbrSections: number;
    nbrToilets: number;
}
