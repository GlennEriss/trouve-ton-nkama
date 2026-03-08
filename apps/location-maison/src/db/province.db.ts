import { Province } from "@/models/province";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createModel, createModelWithCustomId, LocationIdGenerator } from "./generic.db";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.province');

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
        logger.error('Error finding province by name', { error });
        return null;
    }
}

export async function createProvinceIfNotExists(province: Omit<Province, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    try {
        const existing = await findProvinceByName(province.name);
        if (existing) return existing.id;
        
        // Générer l'ID personnalisé avec les coordonnées
        let customId: string;
        if (province.longitude && province.latitude) {
            customId = LocationIdGenerator.generateProvince(province.name, province.longitude, province.latitude);
        } else {
            // Fallback si pas de coordonnées
            customId = province.name.toLowerCase().replace(/\s+/g, '') + '_0.00000_0.00000';
        }
        
        const result = await createModelWithCustomId<Omit<Province, 'id' | 'createdAt' | 'updatedAt'>>(province as any, firebaseCollectionNames.provinces, customId);
        return result;
    } catch (error) {
        logger.error('Error creating province', { error });
        return null;
    }
}

export async function createProvince(province: Omit<Province, 'id' | 'createdAt' | 'updatedAt' | 'state'>): Promise<string | null> {
    return await createProvinceIfNotExists(province);
}

