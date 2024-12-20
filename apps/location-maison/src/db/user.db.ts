import { User } from "@/models/authentication";
import { createModel } from "./generic.db";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
const getFirestore = () => import("@/firebase/firestore");

export async function createUser(user: Partial<User>) {
    return await createModel<Partial<User>>(user)
}

export async function getUserByUID(uid: string): Promise<User|null> {
    try {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.users);
        const q = query(collectionRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error(`No user found with UID: ${uid}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        return { ...userDoc.data(), id: userDoc.id } as User;
    } catch (error) {
        console.error("Error fetching user by UID:", error);
        return null;
    }
}