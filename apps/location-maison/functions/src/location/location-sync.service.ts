import { FieldValue } from 'firebase-admin/firestore';

import { generateLocationId } from './location-id';
import { shouldCreateStreet, type NormalizedLocation } from './location-sync.policy';

export type LocationSyncResult = {
  provinceId: string;
  cityId: string;
  streetId: string | null;
};

type WhereClause = [string, FirebaseFirestore.WhereFilterOp, unknown];

function isAlreadyExistsError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 6 || code === 'already-exists';
}

function withCoordinates(
  base: Record<string, unknown>,
  longitude: number | undefined,
  latitude: number | undefined,
): Record<string, unknown> {
  return {
    ...base,
    ...(longitude !== undefined ? { longitude } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
  };
}

async function findExistingId(
  db: FirebaseFirestore.Firestore,
  collection: string,
  wheres: WhereClause[],
): Promise<string | null> {
  let query: FirebaseFirestore.Query = db.collection(collection);
  for (const [field, op, value] of wheres) {
    query = query.where(field, op, value);
  }
  const snapshot = await query.limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0].id;
}

/**
 * Réutilise un document existant (retrouvé par nom + parent, jamais réécrit — voir
 * docs/performance-creation-modification-annonces-reels.md, point 1 « Idempotence et
 * concurrence ») ou le crée avec l'identifiant déterministe historique
 * (`generateLocationId`, format inchangé dans ce lot).
 *
 * `ref.create()` plutôt que `set()` : si deux événements concurrents traitent la même
 * nouvelle localité, l'identifiant déterministe garantit qu'un seul `create()` réussit —
 * l'autre échoue avec ALREADY_EXISTS, qu'on traite comme un succès (l'id est déjà connu,
 * pas besoin de relire le document).
 */
async function ensureLocationDoc(
  db: FirebaseFirestore.Firestore,
  collection: string,
  name: string,
  findWheres: WhereClause[],
  longitude: number | undefined,
  latitude: number | undefined,
  docFields: Record<string, unknown>,
): Promise<string> {
  const existingId = await findExistingId(db, collection, findWheres);
  if (existingId) return existingId;

  const id = generateLocationId(name, longitude, latitude);
  const ref = db.collection(collection).doc(id);
  try {
    await ref.create({
      ...withCoordinates(docFields, longitude, latitude),
      state: 'IN_PROGRESS',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
  }
  return id;
}

/**
 * Crée ou réutilise la hiérarchie province -> ville -> rue pour une localisation déjà
 * normalisée (voir `extractLocationFields`). Séquentiel et non parallélisable : la ville a
 * besoin de l'identifiant de la province, la rue de ceux de la ville et de la province. Une
 * erreur sur un niveau interrompt les niveaux suivants sans remettre en cause ceux déjà créés
 * (chaque niveau est une écriture indépendante, un rejeu réutilise ce qui existe déjà).
 */
export async function syncPropertyLocation(
  db: FirebaseFirestore.Firestore,
  location: NormalizedLocation,
): Promise<LocationSyncResult> {
  const provinceId = await ensureLocationDoc(
    db,
    'provinces',
    location.province,
    [['name', '==', location.province]],
    location.provinceLon,
    location.provinceLat,
    { name: location.province, country: location.country, countryCode: location.countryCode },
  );

  const cityId = await ensureLocationDoc(
    db,
    'cities',
    location.city,
    [
      ['name', '==', location.city],
      ['provinceName', '==', location.province],
    ],
    location.cityLon,
    location.cityLat,
    {
      name: location.city,
      provinceId,
      provinceName: location.province,
      country: location.country,
      countryCode: location.countryCode,
    },
  );

  let streetId: string | null = null;
  if (shouldCreateStreet(location)) {
    streetId = await ensureLocationDoc(
      db,
      'streets',
      location.street,
      [
        ['name', '==', location.street],
        ['cityName', '==', location.city],
        ['provinceName', '==', location.province],
      ],
      location.streetLon,
      location.streetLat,
      {
        name: location.street,
        cityId,
        cityName: location.city,
        provinceId,
        provinceName: location.province,
        country: location.country,
        countryCode: location.countryCode,
      },
    );
  }

  return { provinceId, cityId, streetId };
}
