// Faithful mirror of the platform listing model — see the canonical source in
// the `location-maison` repo: src/models/annonce.d.ts and
// src/constantes/property-type.ts. Kept dependency-free here (no firebase
// Timestamp import): drafts are not persisted yet, so createdAt/updatedAt are
// omitted. Field names and types must stay in sync with the platform.

/** Keys of TypePropertyEnum in the platform. `typeProperty` stores the key. */
export const TYPE_PROPERTY_KEYS = [
  "Home",
  "Studio",
  "Apartment",
  "Desk",
  "Building",
  "Shop",
  "Kiosk",
  "Room",
  "Property",
  "Logement",
  "Villa",
  "Land",
  "Duplex",
  "Warehouse",
] as const;

export type TypeProperty = (typeof TYPE_PROPERTY_KEYS)[number];
export type StatusProperty = "FOR_RENT" | "FOR_SALE";
export type StateCreation = "ARCHIVED" | "IN_PROGRESS";

export type Image = {
  filePATH: string;
  fileURL: string;
};

export type Location = {
  street: string;
  city: string;
  province: string;
  additionnalInformation?: string;
  longitude: number;
  latitude: number;
  country: string;
  countryCode: string;
  isLocExact?: boolean;
  // Centroid coordinates per administrative level. Absent from annonce.d.ts but
  // present in the create schema (Step3Schema) and the persisted Firestore doc.
  provinceLon?: number;
  provinceLat?: number;
  cityLon?: number;
  cityLat?: number;
  streetLon?: number;
  streetLat?: number;
};

// Property = Location & ICreation & {...}. ICreation fields inlined (the
// non-Timestamp branch is used so this stays firebase-free).
export type Property = Location & {
  id?: string;
  searchableName?: string;
  state: StateCreation;
  typeProperty: TypeProperty;
  images: Image[];
  title: string;
  description: string;
  area: number;
  price: number;
  tags: string[];
  createdBy?: string;
  status: StatusProperty;
  contact?: string;
  isOwner?: boolean;
};

export type Logement = Property & {
  nbrRooms: number;
  nbrKitchens: number;
  nbrBathrooms: number;
  nbrToilets: number;
};

export type Home = Logement & {
  nbrFloors: number;
  nbrGarages: number;
  nbrLivingRoom?: number;
};

export type Villa = Home & {
  nbrPiscine: number;
};

export type Studio = Logement & {
  nbrFloorStudio: number;
  numeroStudio: string;
};

export type Apartment = Logement & {
  nbrFloorApartment: number;
  numeroApartment: string;
};

export type Building = Property & {
  nbrApartments: number;
  nbrFloors: number;
  hasParking: boolean;
};

export type Desk = Property & {
  nbrToilets: number;
  nbrRooms: number;
};

export type Shop = Property & {
  nbrRooms: number;
  nbrToilet: number;
};

export type Kiosk = Property & {
  kioskType: string;
};

export type Room = Property & {
  roomType: string;
};

export type Duplex = Home;

export type Warehouse = Property & {
  nbrSections: number;
  nbrToilets: number;
};
