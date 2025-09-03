import { Province } from "@/models/province";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createModel } from "./generic.db";

const getFirestore = () => import("@/firebase/firestore");

export async function findProvinceByName(name: string): Promise<{ id: string, data: Province } | null> {
    try {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.provinces);
        const q = query(collectionRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const doc = querySnapshot.docs[0];
        return { id: doc.id, data: doc.data() as Province };
    } catch (error) {
        console.error("Error finding province by name:", error);
        return null;
    }
}

export async function createProvinceIfNotExists(province: Omit<Province, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    const existing = await findProvinceByName(province.name);
    if (existing) return existing.id;
    return await createModel<Omit<Province, 'id'>>(province as any, firebaseCollectionNames.provinces);
}

export async function createProvince(province: Omit<Province, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    return await createProvinceIfNotExists(province);
}


