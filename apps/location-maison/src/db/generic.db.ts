import firebaseCollectionNames from "@/constantes/firebase-collection-name";

const getFirestore = () => import("@/firebase/firestore");

export async function createModel<T>(user: T): Promise<string | null> {
    try {
        const { addDoc, collection, db, serverTimestamp } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.users);
        const docRef = await addDoc(collectionRef, {
            ...user,
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