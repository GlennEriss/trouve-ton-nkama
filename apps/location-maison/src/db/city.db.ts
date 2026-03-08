import { City } from "@/models/city";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createModel, createModelWithCustomId, LocationIdGenerator } from "./generic.db";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.city');

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
        logger.error('Error finding city by name', { error });
        return null;
    }
}

export async function createCityIfNotExists(city: Omit<City, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    try {
        const existing = await findCityByName(city.name, city.provinceName);
        if (existing) return existing.id;
        
        // Générer l'ID personnalisé avec les coordonnées
        let customId: string;
        if (city.longitude && city.latitude) {
            customId = LocationIdGenerator.generateCity(city.name, city.longitude, city.latitude);
        } else {
            // Fallback si pas de coordonnées
            customId = city.name.toLowerCase().replace(/\s+/g, '') + '_0.00000_0.00000';
        }
        
        const result = await createModelWithCustomId<Omit<City, 'id' | 'createdAt' | 'updatedAt'>>(city as any, firebaseCollectionNames.cities, customId);
        return result;
    } catch (error) {
        logger.error('Error creating city', { error });
        return null;
    }
}

export async function createCity(city: Omit<City, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    return await createCityIfNotExists(city);
}

