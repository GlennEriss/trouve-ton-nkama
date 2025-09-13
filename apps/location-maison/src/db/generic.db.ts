const getFirestore = () => import("@/firebase/firestore");

export async function createModel<T>(model: T, collectionName: string): Promise<string | null> {
    try {
        const { addDoc, collection, db, serverTimestamp } = await getFirestore();
        const collectionRef = collection(db, collectionName);
        const docRef = await addDoc(collectionRef, {
            ...model,
            state: 'IN_PROGRESS',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id
    } catch (error) {
        console.error("Error creating model:", error);
        return null;
    }
}

export async function deleteModel(id: string, collectionName: string): Promise<boolean> {
    try {
        const { db, doc, deleteDoc } = await getFirestore();
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error("Error deleting model:", error);
        return false;
    }
}

export async function updateModel<T>(id: string, updates: Partial<T>, collectionName: string): Promise<boolean> {
    try {
        const { db, doc, updateDoc, serverTimestamp } = await getFirestore();
        const docRef = doc(db, collectionName, id);
        
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp() 
        });

        return true;
    } catch (error) {
        console.error("Error updating model:", error);
        return false;
    }
}

export async function createModelWithCustomId<T>(model: T, collectionName: string, customId: string): Promise<string | null> {
    try {
        const { setDoc, doc, db, serverTimestamp } = await getFirestore();
        const docRef = doc(db, collectionName, customId);
        await setDoc(docRef, {
            ...model,
            state: 'IN_PROGRESS',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return customId;
    } catch (error) {
        console.error("Error creating model with custom ID:", error);
        return null;
    }
}

/**
 * Générateur d'ID personnalisé pour les localisations
 */
export class LocationIdGenerator {
    /**
     * Génère un ID pour une province: provinceName_longitude_latitude
     */
    static generateProvince(name: string, longitude: number, latitude: number): string {
        const normalizedName = name.toLowerCase().replace(/\s+/g, '');
        const formattedLongitude = longitude.toFixed(5);
        const formattedLatitude = latitude.toFixed(5);
        return `${normalizedName}_${formattedLongitude}_${formattedLatitude}`;
    }

    /**
     * Génère un ID pour une ville: cityName_cityLon_cityLat
     */
    static generateCity(name: string, longitude: number, latitude: number): string {
        const normalizedName = name.toLowerCase().replace(/\s+/g, '');
        const formattedLongitude = longitude.toFixed(5);
        const formattedLatitude = latitude.toFixed(5);
        return `${normalizedName}_${formattedLongitude}_${formattedLatitude}`;
    }

    /**
     * Génère un ID pour une rue: streetName_streetLon_streetLat
     */
    static generateStreet(name: string, longitude: number, latitude: number): string {
        const normalizedName = name.toLowerCase().replace(/\s+/g, '');
        const formattedLongitude = longitude.toFixed(5);
        const formattedLatitude = latitude.toFixed(5);
        return `${normalizedName}_${formattedLongitude}_${formattedLatitude}`;
    }

    /**
     * Méthode générique (pour compatibilité)
     */
    static generate(name: string, longitude: number, latitude: number): string {
        return this.generateProvince(name, longitude, latitude);
    }
}