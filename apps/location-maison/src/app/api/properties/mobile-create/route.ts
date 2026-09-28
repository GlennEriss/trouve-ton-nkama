import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { resolveAuthenticatedUid } from '@/lib/server/authenticated-uid';
import { DirectorFactory } from '@/directors/factory.director';
import {
  ApartmentSchema, BuildingSchema, DeskSchema, DuplexSchema, HomeSchema, KioskSchema,
  PropertySchema, RoomSchema, ShopSchema, StudioSchema, VillaSchema, WarehouseSchema,
} from '@/models/schema';
import type { TypeProperty } from '@/models/annonce';

const imageSchema = z.object({
  fileURL: z.string().url(), filePATH: z.string().min(1),
  thumbURL: z.string().url().optional(), thumbPATH: z.string().min(1).optional(),
});
const baseSchema = z.object({ images: z.array(imageSchema).min(1).max(10), draft: z.record(z.string(), z.unknown()) });
const requestSchema = z.discriminatedUnion('kind', [
  baseSchema.extend({
    kind: z.literal('immobilier'), isOwner: z.boolean(),
    province: z.string().trim().min(1).max(120), city: z.string().trim().min(1).max(120),
    district: z.string().trim().min(1).max(160),
  }),
  baseSchema.extend({ kind: z.literal('category') }),
]);

function schemaForType(type: TypeProperty) {
  switch (type) {
    case 'Apartment': return ApartmentSchema;
    case 'Building': return BuildingSchema;
    case 'Desk': return DeskSchema;
    case 'Duplex': return DuplexSchema;
    case 'Home': return HomeSchema;
    case 'Kiosk': return KioskSchema;
    case 'Room': return RoomSchema;
    case 'Shop': return ShopSchema;
    case 'Studio': return StudioSchema;
    case 'Villa': return VillaSchema;
    case 'Warehouse': return WarehouseSchema;
    default: return PropertySchema;
  }
}

async function findUserByUid(uid: string) {
  const snapshot = await getFirestore().collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

function placeId(prefix: string, value: string) {
  return `mobile:${prefix}:${value.trim().toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, '-')}`;
}

export async function POST(request: NextRequest) {
  const uid = await resolveAuthenticatedUid(request);
  if (!uid) return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Données invalides.', issues: parsed.error.issues }, { status: 400 });

  const userDoc = await findUserByUid(uid);
  if (!userDoc) return NextResponse.json({ success: false, message: 'Profil utilisateur introuvable.' }, { status: 404 });
  const user = userDoc.data();
  const contact = String(user.callNumber || user.phoneNumbers?.[0] || user.whatsappNumber || '').trim();
  if (!contact) return NextResponse.json({ success: false, message: 'Ajoute un numéro de téléphone à ton profil avant de publier.' }, { status: 400 });

  let property: Record<string, unknown>;
  if (parsed.data.kind === 'immobilier') {
    const typeProperty = parsed.data.draft.typeProperty as TypeProperty;
    if (!typeProperty) return NextResponse.json({ success: false, message: 'Type de bien manquant.' }, { status: 400 });
    const skeleton = DirectorFactory.createDirectorProperty(typeProperty).build();
    const raw = {
      ...skeleton, ...parsed.data.draft, typeProperty, images: parsed.data.images,
      isOwner: parsed.data.isOwner,
      address: { province: parsed.data.province, city: parsed.data.city, district: parsed.data.district },
      province: parsed.data.province, city: parsed.data.city, street: parsed.data.district,
      cityPlaceId: placeId('city', parsed.data.city), districtPlaceId: placeId('district', parsed.data.district),
      locationSource: 'UNVERIFIED', country: 'Gabon', countryCode: 'GA', isLocExact: false,
      longitude: 0, latitude: 0, provinceLon: 0, provinceLat: 0, cityLon: 0, cityLat: 0, streetLon: 0, streetLat: 0,
      contact: String(parsed.data.draft.contact || contact),
      callContact: String(parsed.data.draft.callContact || ''),
      whatsappContact: String(parsed.data.draft.whatsappContact || ''),
    };
    const validated = schemaForType(typeProperty).safeParse(raw);
    if (!validated.success) return NextResponse.json({ success: false, message: validated.error.issues[0]?.message ?? 'Annonce invalide.' }, { status: 422 });
    property = { ...validated.data, typeProperty };
  } else {
    const draft = parsed.data.draft;
    const cities = Array.isArray(draft.cities) ? draft.cities.filter((city): city is string => typeof city === 'string' && city.trim().length > 0) : [];
    property = {
      title: String(draft.title || ''), description: String(draft.description || ''), price: Number(draft.price || 0),
      images: parsed.data.images, categoryId: String(draft.categoryId || ''), categoryPath: draft.categoryPath,
      attributes: draft.attributes && typeof draft.attributes === 'object' ? draft.attributes : {},
      cities, city: cities[0] || 'Libreville', province: 'Estuaire', street: '', country: 'Gabon', countryCode: 'GA',
      isLocExact: false, locationSource: 'UNVERIFIED', contact, callContact: contact,
      whatsappContact: String(user.whatsappNumber || contact), tags: [],
    };
    if (!property.title || !property.description || !property.categoryId) {
      return NextResponse.json({ success: false, message: 'Annonce générée incomplète.' }, { status: 422 });
    }
  }

  const ref = getFirestore().collection(firebaseCollectionNames.properties).doc();
  await ref.set({
    ...property, createdBy: uid, ownerUids: [uid], moderationStatus: 'PENDING', rejectionReason: null,
    state: 'IN_PROGRESS', source: 'mobile', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ success: true, id: ref.id });
}
