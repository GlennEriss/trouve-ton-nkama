import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { Property, TypeProperty } from "@/models/annonce";
import { createModel, deleteModel, updateModel } from "./generic.db";
import { collectionFirebaseNames } from "@/constantes";
import { createLogger } from '@/lib/logger';
import { invalidatePropertySeoCache } from '@/lib/invalidate-property-seo-cache';

const logger = createLogger('db.property');

const getFirestore = () => import("@/firebase/firestore");

function normalizeKitchenField<T extends Record<string, any>>(data: T): T {
    if (!data || typeof data !== 'object') {
        return data;
    }

    if ((data.nbrKitchens === undefined || data.nbrKitchens === null) && data.nbrChickens !== undefined) {
        return { ...data, nbrKitchens: data.nbrChickens } as T;
    }

    return data;
}

export async function updateProperty(id: string, property: Partial<Property>): Promise<boolean>{
    const updated = await updateModel<Property>(id, property, collectionFirebaseNames.properties)
    if (updated) {
        void invalidatePropertySeoCache();
    }
    return updated;

}
export async function createProperty(property: Property): Promise<string | null> {
    // Toute nouvelle annonce démarre en attente de review, quelle que soit la valeur
    // fournie par l'appelant (défense en profondeur, en plus de firestore.rules).
    const { rejectionReason, moderationReviewedAt, moderationReviewedBy, ...safeProperty } = property;
    const payload: Property = { ...safeProperty, moderationStatus: 'PENDING' };
    const id = await createModel<Property>(payload, firebaseCollectionNames.properties);
    if (id) {
        void invalidatePropertySeoCache();
    }
    return id;
}

export async function deleteProperty(id: string): Promise<boolean> {
    const deleted = await deleteModel(id, firebaseCollectionNames.properties)
    if (deleted) {
        void invalidatePropertySeoCache();
    }
    return deleted;
}
export async function getProperties({ limitPerPage, lastDoc, createdBy, type }: { limitPerPage: number, lastDoc: any, createdBy?: string, type?: string }) {
    const { collection, doc, getDoc, getDocs, db, where, query, startAfter, limit, orderBy } = await getFirestore();
    const professionalRef = collection(db, firebaseCollectionNames.properties);
    let q = query(
        professionalRef,
        where('state', '==', 'IN_PROGRESS'),
        where('moderationStatus', '==', 'APPROVED'),
        orderBy('createdAt', 'desc'),
    )
    if (limitPerPage > 0) {
        q = query(
            q,
            limit(limitPerPage)
        )
    }

    if (createdBy) {
        q = query(
            q,
            where('createdBy', '==', createdBy)
        );
    }
    if (type) {
        q = query(
            q,
            where('typeProperty', '==', type)
        );
    }
    let cursor = lastDoc;
    if (typeof cursor === 'string') {
        const cursorSnapshot = await getDoc(doc(db, firebaseCollectionNames.properties, cursor));
        cursor = cursorSnapshot.exists() ? cursorSnapshot : null;
    }
    if (cursor) {
        q = query(
            q,
            startAfter(cursor)
        )
    }
    const querySnapshot = await getDocs(q);
    const properties: Property[] = [];
    if (querySnapshot.docs.length < limitPerPage) {
        lastDoc = null;
    } else {
        const nextCursor = querySnapshot.docs[querySnapshot.docs.length - 1];
        const nextQuery = query(q, startAfter(nextCursor), limit(1));
        const nextQuerySnapshot = await getDocs(nextQuery);
        if (nextQuerySnapshot.docs.length === 0) {
            lastDoc = null;
        } else {
            lastDoc = nextCursor.id;
        }
    }
    querySnapshot.forEach((doc: any) => {
        const data = normalizeKitchenField({ ...doc.data(), id: doc.id });
        properties.push(data as Property);
    });
    return {
        properties,
        limitPerPage,
        lastDoc,
    };
}

/**
 * Récupère le nombre total de propriétés pour un type donné dans Firestore.
 *
 * @async
 * @function getCountStatisticsByPropertyType
 * @param {TypeProperty} type - Le type de propriété (Home, Studio, Apartment, etc.).
 * @returns {Promise<number>} - Retourne le nombre total de propriétés pour ce type.
 * @throws {Error} - Lève une erreur si la récupération échoue.
 */
export async function getCountStatisticsByPropertyType(createdBy: string, type?: TypeProperty,): Promise<number> {
    const { collection, getCountFromServer, db, where, query } = await getFirestore();
    const propertiesRef = collection(db, firebaseCollectionNames.properties);

    try {
        // Créer la requête pour compter les documents avec le type spécifié
        let q = query(propertiesRef,
            where('createdBy', '==', createdBy)
        );
        if (type) {
            q = query(q,
                where('typeProperty', '==', type),
            );
        }
        // Utiliser getCountFromServer pour compter les documents
        const snapshot = await getCountFromServer(q);

        return snapshot.data().count; // Retourner le nombre total
    } catch (error) {
        logger.error('Error fetching property count', { createdBy, type, error });
        throw new Error("Failed to fetch property count");
    }
}

/**
 * Retrieve a property document from Firestore by its ID.
 * 
 * @param {string} id - The unique ID of the property to be retrieved.
 * @returns {Promise<Property | null>} - Returns a promise that resolves with the property object or null if not found.
 * @throws {Error} - Throws an error if the retrieval fails.
 */
export async function getPropertyById(id: string): Promise<Property | null> {
    try {
        const { doc, getDoc, db } = await getFirestore();
        const propertyDocRef = doc(db, firebaseCollectionNames.properties, id);

        // Fetch the document
        const propertySnapshot = await getDoc(propertyDocRef);

        // Check if the document exists
        if (propertySnapshot.exists()) {
            // Return the property data with the document ID included
            const property = normalizeKitchenField({ ...propertySnapshot.data() }) as Property
            return { ...property, id: propertySnapshot.id, /* updatedAt: (property.updatedAt as any).toDate(), createdAt: (property.createdAt as any).toDate() */ } as Property;
        } else {
            // Return null if no document was found
            return null;
        }
    } catch (error) {
        logger.error('Error fetching property by ID', { id, error });
        throw new Error(`Failed to fetch property with ID ${id}: ${error}`);
    }
}


/**
 * Récupère le nombre total de propriétés pour une province donnée dans Firestore.
 *
 * @async
 * @function getServerCountByProvince
 * @param {string} province - Le nom de la province pour laquelle compter les propriétés.
 * @returns {Promise<number>} - Retourne le nombre total de propriétés pour cette province.
 * @throws {Error} - Lève une erreur si la récupération échoue.
 */
export async function getServerCountByProvince(province: string): Promise<number> {
    try {
        const { collection, getCountFromServer, db, where, query } = await getFirestore();
        const propertiesRef = collection(db, firebaseCollectionNames.properties);

        // Créer la requête pour compter les documents avec la province spécifiée
        const q = query(propertiesRef,
            where('province', '==', province),
            where('moderationStatus', '==', 'APPROVED')
        );

        // Utiliser getCountFromServer pour compter les documents
        const snapshot = await getCountFromServer(q);

        return snapshot.data().count; // Retourner le nombre total
    } catch (error) {
        logger.error('Error fetching property count by province', { province, error });
        throw new Error("Failed to fetch property count by province");
    }
}
/**
 * Récupère le nombre total de propriétés pour un type donné dans Firestore.
 *
 * @async
 * @function getServerCountByPropertyType
 * @param {string} type - Le type de propriété (ex: "Apartment", "House", "Land").
 * @returns {Promise<number>} - Retourne le nombre total de propriétés pour ce type.
 * @throws {Error} - Lève une erreur si la récupération échoue.
 */
export async function getServerCountByPropertyType(type: string): Promise<number> {
    try {
        const { collection, getCountFromServer, db, where, query } = await getFirestore();
        const propertiesRef = collection(db, firebaseCollectionNames.properties);

        // Créer la requête pour compter les documents avec le type spécifié
        const q = query(propertiesRef,
            where('typeProperty', '==', type),
            where('moderationStatus', '==', 'APPROVED')
        );

        // Utiliser getCountFromServer pour compter les documents
        const snapshot = await getCountFromServer(q);

        return snapshot.data().count; // Retourner le nombre total
    } catch (error) {
        logger.error('Error fetching property count by type', { type, error });
        throw new Error("Failed to fetch property count by type");
    }
}

/**
 * Récupère le nombre d'annonces APPROVED pour une feuille de catégorie donnée
 * (categoryId, ex. "vetements") — équivalent de getServerCountByPropertyType pour les
 * catégories hors immobilier (Lot 5/9, tuiles "Types d'annonces" de la home).
 */
export async function getServerCountByCategoryId(categoryId: string): Promise<number> {
    try {
        const { collection, getCountFromServer, db, where, query } = await getFirestore();
        const propertiesRef = collection(db, firebaseCollectionNames.properties);

        const q = query(propertiesRef,
            where('categoryId', '==', categoryId),
            where('moderationStatus', '==', 'APPROVED')
        );

        const snapshot = await getCountFromServer(q);

        return snapshot.data().count;
    } catch (error) {
        logger.error('Error fetching property count by category', { categoryId, error });
        throw new Error("Failed to fetch property count by category");
    }
}
