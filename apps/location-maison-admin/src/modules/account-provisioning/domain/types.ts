export type ProvisionedAccountType = "user" | "announcer";

export type CreateProvisionedAccountInput = {
  accountType: ProvisionedAccountType;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  phoneNumber: string;
  countryName: string;
  countryCode: string;
  birthDate?: string;
  birthdate?: {
    day: string;
    month: string;
    year: string;
  };
  credits?: number;
};

export type CreateProvisionedAccountResult = {
  uid: string;
  accountType: ProvisionedAccountType;
  email: string;
  roles: string[];
  emailVerified: true;
  phoneNumber: string;
};

export type ListingTypeProperty =
  | "Home"
  | "Studio"
  | "Apartment"
  | "Desk"
  | "Building"
  | "Shop"
  | "Kiosk"
  | "Room"
  | "Property"
  | "Logement"
  | "Villa"
  | "Land";

export type ListingStatus = "FOR_RENT" | "FOR_SALE";

export type ListingImageInput = {
  fileURL: string;
  filePATH?: string;
};

export type CreateListingForAnnouncerInput = {
  announcerUid: string;
  moderationReviewedBy?: string;
  moderationReviewReason?: string;
  title: string;
  description: string;
  typeProperty: ListingTypeProperty;
  status: ListingStatus;
  isOwner: boolean;
  price: number;
  area: number;
  tags?: string[];
  images?: ListingImageInput[];
  street: string;
  city: string;
  province: string;
  provinceLon?: number;
  provinceLat?: number;
  cityLon?: number;
  cityLat?: number;
  streetLon?: number;
  streetLat?: number;
  additionnalInformation?: string;
  longitude?: number;
  latitude?: number;
  country: string;
  countryCode: string;
  isLocExact?: boolean;
  contact?: string;
  nbrRooms?: number;
  nbrKitchens?: number;
  nbrBathrooms?: number;
  nbrToilets?: number;
  nbrGarages?: number;
  nbrFloors?: number;
  nbrLivingRoom?: number;
  nbrFloorStudio?: number;
  numeroStudio?: string;
  nbrFloorApartment?: number;
  numeroApartment?: string;
  nbrPiscine?: number;
  nbrApartments?: number;
  hasParking?: boolean;
  nbrToilet?: number;
  kioskType?: string;
  roomType?: string;
};

export type CreateListingForAnnouncerResult = {
  propertyId: string;
  announcerUid: string;
  typeProperty: ListingTypeProperty;
  status: ListingStatus;
  title: string;
};

export type ExistingPlatformUser = {
  uid: string;
  email: string | null;
  login: string | null;
  firstname: string | null;
  lastname: string | null;
  phoneNumbers: string[];
  roles: string[];
};
