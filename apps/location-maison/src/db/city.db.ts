import { City } from "@/models/city";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createModel } from "./generic.db";

const getFirestore = () => import("@/firebase/firestore");

export async function findCityByName(name: string, provinceName?: string): Promise<{ id: string, data: City } | null> {
    try {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const { and } = await import("firebase/firestore");
        const collectionRef = collection(db, firebaseCollectionNames.cities);
        
        // Construire les conditions de manière cumulative
        const conditions = [where("name", "==", name)];
        if (provinceName) {
            conditions.push(where("provinceName", "==", provinceName));
        }
        
        const q = query(collectionRef, and(...conditions));
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
    try {
        const existing = await findCityByName(city.name, city.provinceName);
        if (existing) return existing.id;
        const result = await createModel<Omit<City, 'id'>>(city as any, firebaseCollectionNames.cities);
        return result;
    } catch (error) {
        console.error("Error creating city:", error);
        return null;
    }
}

export async function createCity(city: Omit<City, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    return await createCityIfNotExists(city);
}


