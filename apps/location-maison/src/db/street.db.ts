import { Street } from "@/models/street";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createModel } from "./generic.db";

const getFirestore = () => import("@/firebase/firestore");

export async function findStreetByName(name: string, cityName?: string, provinceName?: string): Promise<{ id: string, data: Street } | null> {
    try {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.streets);
        let q = query(collectionRef, where("name", "==", name));
        if (cityName) {
            q = query(collectionRef, where("name", "==", name), where("cityName", "==", cityName));
        }
        if (provinceName) {
            q = query(collectionRef, where("name", "==", name), where("provinceName", "==", provinceName));
        }
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const doc = querySnapshot.docs[0];
        return { id: doc.id, data: doc.data() as Street };
    } catch (error) {
        console.error("Error finding street by name:", error);
        return null;
    }
}

export async function createStreetIfNotExists(street: Omit<Street, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    const existing = await findStreetByName(street.name, street.cityName, street.provinceName);
    if (existing) return existing.id;
    return await createModel<Omit<Street, 'id'>>(street as any, firebaseCollectionNames.streets);
}

export async function createStreet(street: Omit<Street, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    return await createStreetIfNotExists(street);
}


