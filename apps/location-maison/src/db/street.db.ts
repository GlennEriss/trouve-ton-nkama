import { Street } from "@/models/street";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createModel, createModelWithCustomId, LocationIdGenerator } from "./generic.db";

const getFirestore = () => import("@/firebase/firestore");

export async function findStreetByName(name: string, cityName?: string, provinceName?: string): Promise<{ id: string, data: Street } | null> {
    try {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const { and } = await import("firebase/firestore");
        const collectionRef = collection(db, firebaseCollectionNames.streets);
        
        // Construire les conditions de manière cumulative
        const conditions = [where("name", "==", name)];
        if (cityName) {
            conditions.push(where("cityName", "==", cityName));
        }
        if (provinceName) {
            conditions.push(where("provinceName", "==", provinceName));
        }
        
        const q = query(collectionRef, and(...conditions));
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
    try {
        const existing = await findStreetByName(street.name, street.cityName, street.provinceName);
        if (existing) return existing.id;
        
        // Générer l'ID personnalisé avec les coordonnées
        let customId: string;
        if (street.longitude && street.latitude) {
            customId = LocationIdGenerator.generateStreet(street.name, street.longitude, street.latitude);
        } else {
            // Fallback si pas de coordonnées
            customId = street.name.toLowerCase().replace(/\s+/g, '') + '_0.00000_0.00000';
        }
        
        const result = await createModelWithCustomId<Omit<Street, 'id' | 'createdAt' | 'updatedAt'>>(street as any, firebaseCollectionNames.streets, customId);
        return result;
    } catch (error) {
        console.error("Error creating street:", error);
        return null;
    }
}

export async function createStreet(street: Omit<Street, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    return await createStreetIfNotExists(street);
}


