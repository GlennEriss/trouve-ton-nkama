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