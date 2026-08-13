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

// Catégorisation multi-catégories (Lot 1, voir
// docs/marketplace-multi-categories/00-le-vrai-probleme.md) : le tronc commun d'une
// annonce n'est plus exclusivement immobilier. `typeProperty`/`area`/`status` restent la
// source de vérité pour l'immobilier et ne sont pas dupliqués dans `attributes` — ce champ
// ne sert qu'aux catégories qui n'ont pas leur propre schéma de champs (Mode, etc.).
export type CategoryPath = {
    lvl0: string
    lvl1?: string
}

export type ListingAttributeValue = string | number | boolean

export type Property = Location & ICreation & {
    typeProperty: TypeProperty
    // Optionnels tant que le backfill (scripts/backfill-listing-categories.js) n'a pas
    // tourné sur toutes les annonces existantes — voir docs/marketplace-multi-categories/
    // 07-lots-et-sequencement.md, Lot 1.
    categoryId?: string
    categoryPath?: CategoryPath
    attributes?: Record<string, ListingAttributeValue>
    images: Image[]
    title: string,
    description: string,
    area: number,
    price: number,
    tags: TagName[],
    createdBy?: string,
    status: StatusProperty,
    contact?: string //Propriété tampon
    // Overrides optionnels : si absents, WhatsApp et Appel retombent tous les
    // deux sur `contact` (comportement historique, annonces existantes non
    // affectées) — voir ContactSection.tsx / PreviewPropertyMobile.tsx.
    whatsappContact?: string
    callContact?: string
    // Numéros au-delà du principal (annonces avec plusieurs contacts —
    // propriétaire/agent/membre de la famille, etc.) — chacun affiché avec sa
    // propre paire de boutons WhatsApp/Appel dans ContactSection.tsx.
    additionalContacts?: string[]
    isOwner?: boolean

    // Auto-attribution annonceur (Lot 4b) : rattachement par numéro de téléphone
    // vérifié (OTP), distinct de `createdBy` qui reste l'auteur original (souvent
    // l'admin via import Apify). Co-gestion : l'annonceur édite, l'admin modère.
    claimedBy?: string
    claimedAt?: Timestamp

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

    // Cadeaux (dons MoMo) reçus sur cette annonce — voir applyGiftOnce (Cloud Function).
    giftCount?: number;
    giftTotalAmount?: number;
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
    cityPlaceId?: string
    districtPlaceId?: string
    locationSource?: 'OFFICIAL_CATALOG' | 'GOOGLE_PLACES' | 'GPS' | 'LEGACY' | 'UNVERIFIED'
}
export type Logement = Property & {
    nbrRooms: number,
    nbrKitchens: number,
    nbrBathrooms: number,
    nbrToilets: number
}

export type Apartment = Logement & {
    nbrFloorApartment: number,
    numeroApartment?: string
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
    numeroStudio?: string
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
