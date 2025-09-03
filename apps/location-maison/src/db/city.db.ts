import { City } from "@/models/city";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createModel } from "./generic.db";

const getFirestore = () => import("@/firebase/firestore");

export async function findCityByName(name: string, provinceName?: string): Promise<{ id: string, data: City } | null> {
    try {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.cities);
        let q = query(collectionRef, where("name", "==", name));
        if (provinceName) {
            q = query(collectionRef, where("name", "==", name), where("provinceName", "==", provinceName));
        }
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const doc = querySnapshot.docs[0];
        return { id: doc.id, data: doc.data() as City };
    } catch (error) {
        console.error("Error finding city by name:", error);
        return null;
    }
}

export async function createCityIfNotExists(city: Omit<City, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    const existing = await findCityByName(city.name, city.provinceName);
    if (existing) return existing.id;
    return await createModel<Omit<City, 'id'>>(city as any, firebaseCollectionNames.cities);
}

export async function createCity(city: Omit<City, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    return await createCityIfNotExists(city);
}


