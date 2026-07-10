import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  CreateListingForAnnouncerInput,
  ExistingPlatformUser,
  ListingImageInput,
} from "@/modules/account-provisioning/domain/types";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

const USERS_COLLECTION = COLLECTIONS.users;
const PROPERTIES_COLLECTION = COLLECTIONS.properties;

type RawUserDoc = {
  uid?: unknown;
  email?: unknown;
  login?: unknown;
  firstname?: unknown;
  lastname?: unknown;
  phoneNumbers?: unknown;
  roles?: unknown;
};

function sanitizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function mapUser(uid: string, data: RawUserDoc): ExistingPlatformUser {
  return {
    uid,
    email: sanitizeString(data.email),
    login: sanitizeString(data.login),
    firstname: sanitizeString(data.firstname),
    lastname: sanitizeString(data.lastname),
    phoneNumbers: sanitizeStringArray(data.phoneNumbers),
    roles: sanitizeStringArray(data.roles),
  };
}

function normalizeImages(images: ListingImageInput[] | undefined) {
  return (images ?? [])
    .map((image) => ({
      fileURL: image.fileURL.trim(),
      filePATH: (image.filePATH ?? "").trim(),
    }))
    .filter((image) => image.fileURL.length > 0);
}

function normalizeRolesForUserDocument(roles: string[]) {
  const cleaned = roles
    .map((role) => role.trim())
    .filter((role) => role.length > 0);

  const hasAnnouncer = cleaned.some((role) => role.toLowerCase() === "announcer");
  const hasUser = cleaned.some((role) => role.toLowerCase() === "user");

  const next = [...cleaned];
  if (hasAnnouncer && !hasUser) {
    next.unshift("User");
  }

  return Array.from(new Set(next));
}

export async function findPlatformUserByUid(uid: string) {
  const db = getFirebaseAdminDb();

  const directSnapshot = await db.collection(USERS_COLLECTION).doc(uid).get();
  if (directSnapshot.exists) {
    return mapUser(directSnapshot.id, directSnapshot.data() as RawUserDoc);
  }

  const byUidSnapshot = await db
    .collection(USERS_COLLECTION)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  if (byUidSnapshot.empty) {
    return null;
  }

  const userDoc = byUidSnapshot.docs[0];
  return mapUser(userDoc.id, userDoc.data() as RawUserDoc);
}

export async function findPlatformUserByEmailOrLogin(email: string) {
  const db = getFirebaseAdminDb();

  const [emailSnapshot, loginSnapshot] = await Promise.all([
    db.collection(USERS_COLLECTION).where("email", "==", email).limit(1).get(),
    db.collection(USERS_COLLECTION).where("login", "==", email).limit(1).get(),
  ]);

  const firstDoc = emailSnapshot.docs[0] ?? loginSnapshot.docs[0];
  if (!firstDoc) {
    return null;
  }

  return mapUser(firstDoc.id, firstDoc.data() as RawUserDoc);
}

export async function findPlatformUserByPhone(phoneNumber: string) {
  const db = getFirebaseAdminDb();

  const snapshot = await db
    .collection(USERS_COLLECTION)
    .where("phoneNumbers", "array-contains", phoneNumber)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const userDoc = snapshot.docs[0];
  return mapUser(userDoc.id, userDoc.data() as RawUserDoc);
}

export async function createPlatformUserDocument(input: {
  uid: string;
  email: string;
  firstname: string;
  lastname: string;
  phoneNumber: string;
  countryName: string;
  countryCode: string;
  birthDate?: string;
  roles: string[];
  credits: number;
  metadata: Record<string, unknown>;
}) {
  const db = getFirebaseAdminDb();
  const normalizedRoles = normalizeRolesForUserDocument(input.roles);

  await db.collection(USERS_COLLECTION).doc(input.uid).set({
    uid: input.uid,
    login: input.email,
    firstname: input.firstname,
    lastname: input.lastname,
    birthDate: input.birthDate ?? null,
    email: input.email,
    country: {
      name: input.countryName,
      code: input.countryCode,
    },
    phoneNumbers: [input.phoneNumber],
    phoneNumberVerified: false,
    roles: normalizedRoles,
    emailVerified: true,
    providers: ["CREDENTIALS"],
    metadata: input.metadata,
    notificationParameter: {
      isNew: true,
      isAccountActivity: true,
      isNewAnnouncement: true,
      isFavoris: true,
      isPersonalizedSuggestions: true,
      isSystemUpdated: true,
    },
    favoris: [],
    searchableName: `${input.firstname} ${input.lastname}`.trim().toLowerCase(),
    credits: input.credits,
    state: "IN_PROGRESS",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function createPropertyDocumentForAnnouncer(
  input: CreateListingForAnnouncerInput & {
    contact: string;
    sanitizedTags: string[];
  },
) {
  const db = getFirebaseAdminDb();

  const payload = {
    title: input.title,
    description: input.description,
    typeProperty: input.typeProperty,
    status: input.status,
    isOwner: input.isOwner,
    price: input.price,
    area: input.area,
    tags: input.sanitizedTags,
    images: normalizeImages(input.images),
    street: input.street,
    city: input.city,
    province: input.province,
    provinceLon: input.provinceLon ?? null,
    provinceLat: input.provinceLat ?? null,
    cityLon: input.cityLon ?? null,
    cityLat: input.cityLat ?? null,
    streetLon: input.streetLon ?? null,
    streetLat: input.streetLat ?? null,
    additionnalInformation: input.additionnalInformation ?? "",
    longitude: input.longitude ?? 0,
    latitude: input.latitude ?? 0,
    country: input.country,
    countryCode: input.countryCode,
    isLocExact: input.isLocExact ?? false,
    contact: input.contact,
    createdBy: input.announcerUid,
    searchableName: input.title.trim().toLowerCase(),
    moderationStatus: "APPROVED",
    moderationReviewedAt: FieldValue.serverTimestamp(),
    moderationReviewedBy: input.moderationReviewedBy ?? null,
    rejectionReason: null,
    moderationReviewReason: input.moderationReviewReason ?? "Publication créée depuis le dashboard admin.",
    nbrRooms: input.nbrRooms ?? null,
    nbrKitchens: input.nbrKitchens ?? null,
    nbrBathrooms: input.nbrBathrooms ?? null,
    nbrToilets: input.nbrToilets ?? null,
    nbrGarages: input.nbrGarages ?? null,
    nbrFloors: input.nbrFloors ?? null,
    nbrLivingRoom: input.nbrLivingRoom ?? null,
    nbrFloorStudio: input.nbrFloorStudio ?? null,
    numeroStudio: input.numeroStudio ?? null,
    nbrFloorApartment: input.nbrFloorApartment ?? null,
    numeroApartment: input.numeroApartment ?? null,
    nbrPiscine: input.nbrPiscine ?? null,
    nbrApartments: input.nbrApartments ?? null,
    hasParking: input.hasParking ?? null,
    nbrToilet: input.nbrToilet ?? null,
    kioskType: input.kioskType ?? null,
    roomType: input.roomType ?? null,
    state: "IN_PROGRESS",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection(PROPERTIES_COLLECTION).add(payload);
  return docRef.id;
}
