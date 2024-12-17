import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { Property, TypeProperty } from "@/models/annonce";

const getFirestore = () => import("@/firebase/firestore");

export async function getProperties({ limitPerPage, lastDoc, createdBy, type }: { limitPerPage: number, lastDoc: any, createdBy: string, type: string }) {
    const { collection, getDocs, db, where, query, startAfter, limit, orderBy } = await getFirestore();
    const professionalRef = collection(db, firebaseCollectionNames.properties);
    let q = query(
        professionalRef,
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
    if (lastDoc) {
        q = query(
            q,
            startAfter(lastDoc)
        )
    }
    const querySnapshot = await getDocs(q);
    const properties: Property[] = [];
    if (querySnapshot.docs.length < limitPerPage) {
        lastDoc = null;
    } else {
        lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        const nextQuery = query(q, startAfter(lastDoc), limit(1));
        const nextQuerySnapshot = await getDocs(nextQuery);
        if (nextQuerySnapshot.docs.length === 0) {
            lastDoc = null;
        }
    }
    querySnapshot.forEach((doc: any) => {
        properties.push({ id: doc.id, ...doc.data() } as Property);
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
export async function getCountStatisticsByPropertyType(type: TypeProperty, createdBy: string): Promise<number> {
    const { collection, getCountFromServer, db, where, query } = await getFirestore();
    const propertiesRef = collection(db, firebaseCollectionNames.properties);

    try {
        // Créer la requête pour compter les documents avec le type spécifié
        const q = query(propertiesRef,
            where('typeProperty', '==', type),
            where('createdBy', '==', createdBy)
        );

        // Utiliser getCountFromServer pour compter les documents
        const snapshot = await getCountFromServer(q);

        return snapshot.data().count; // Retourner le nombre total
    } catch (error) {
        console.error("Error fetching property count:", error);
        throw new Error("Failed to fetch property count");
    }
}