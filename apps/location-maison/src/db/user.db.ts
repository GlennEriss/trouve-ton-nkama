import { User } from "@/models/authentication";
import { createModel } from "./generic.db";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
const getFirestore = () => import("@/firebase/firestore");

export async function createUser(user: Partial<User>) {
    return await createModel<Partial<User>>(user, firebaseCollectionNames.users)
}

export async function getUserByUID(uid: string): Promise<User | null> {
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

export async function findUserDetailsByUserID(uid: string) {
    try {
        const { getDocs, where, query, collection, db } = await getFirestore();
        const docSnapshot = await getDocs(
            query(collection(db, firebaseCollectionNames.users), where("uid", "==", uid))
        );
        if (docSnapshot.empty) {
            return null;
        }
        const userDetailsDoc = docSnapshot.docs[0];
        const userDetails = {
            ...userDetailsDoc.data(),
        };
        return userDetails;
    } catch (error) {
        console.error("Error retrieving userDetails:", error);
        return null
    }
}

export async function findUserByEmail(email: string) {
    try {
        const { getDocs, where, query, collection, db } = await getFirestore();
        const docSnapshot = await getDocs(
            query(collection(db, firebaseCollectionNames.users), where("email", "==", email))
        );
        if (docSnapshot.empty) {
            return null;
        }
        const userDetailsDoc = docSnapshot.docs[0];
        const userDetails = {
            id: userDetailsDoc.id,
            ...userDetailsDoc.data() as User,
        };
        return userDetails;
    } catch (error) {
        console.error("Error retrieving userDetails by email:", error);
        throw error;
    }
}

export async function updateUser(uid: string, updates: Partial<User>): Promise<boolean> {
    try {
        const { db, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.users);
        const q = query(collectionRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error(`No user found with UID: ${uid}`);
            return false;
        }

        const userDoc = querySnapshot.docs[0];
        const userRef = doc(db, firebaseCollectionNames.users, userDoc.id);

        const { createdAt, ...otherUpdates } = updates;
        await updateDoc(userRef, {
            ...otherUpdates,
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Error updating user:", error);
        return false;
    }
}

export async function findUserByPhoneNumber(phoneNumber: string) {
    try {
        const { getDocs, where, query, collection, db } = await getFirestore();
        const docSnapshot = await getDocs(
            query(
                collection(db, firebaseCollectionNames.users),
                where("phoneNumbers", "array-contains", phoneNumber)
            )
        );
        if (docSnapshot.empty) {
            return null;
        }
        const userDetailsDoc = docSnapshot.docs[0];
        const userDetails = {
            id: userDetailsDoc.id,
            ...userDetailsDoc.data() as User,
        };
        return userDetails;
    } catch (error) {
        console.error("Error retrieving user by phone number:", error);
        throw error;
    }
}