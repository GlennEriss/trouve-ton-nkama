import { User } from "@/models/authentication";
import { createModel } from "./generic.db";
import firebaseCollectionNames from "@/constantes/firebase-collection-name";
import { createLogger } from '@/lib/logger';

const logger = createLogger('db.user');
const getFirestore = () => import("@/firebase/firestore");

export async function createUser(user: Partial<User>) {
    // Ajouter 3 crédits par défaut aux nouveaux utilisateurs
    const userWithCredits = {
        ...user,
        credits: 3
    };
    return await createModel<Partial<User>>(userWithCredits, firebaseCollectionNames.users)
}

export async function getUserByUID(uid: string): Promise<User | null> {
    try {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.users);
        const q = query(collectionRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            logger.warn('No user found with UID', { uid });
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        return { ...userDoc.data(), id: userDoc.id } as User;
    } catch (error) {
        logger.error('Error fetching user by UID', { uid, error });
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
        logger.error('Error retrieving userDetails', { uid, error });
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
        logger.error('Error retrieving userDetails by email', { email, error });
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
            logger.warn('No user found with UID for update', { uid });
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
        logger.error('Error updating user', { uid, error });
        return false;
    }
}

export async function addFcmToken(uid: string, token: string): Promise<boolean> {
    try {
        const { db, collection, query, where, getDocs, doc, updateDoc, arrayUnion } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.users);
        const q = query(collectionRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            logger.warn('No user found with UID to add FCM token', { uid });
            return false;
        }

        const userRef = doc(db, firebaseCollectionNames.users, querySnapshot.docs[0].id);
        await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
        return true;
    } catch (error) {
        logger.error('Error adding FCM token', { uid, error });
        return false;
    }
}

export async function removeFcmToken(uid: string, token: string): Promise<boolean> {
    try {
        const { db, collection, query, where, getDocs, doc, updateDoc, arrayRemove } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.users);
        const q = query(collectionRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            logger.warn('No user found with UID to remove FCM token', { uid });
            return false;
        }

        const userRef = doc(db, firebaseCollectionNames.users, querySnapshot.docs[0].id);
        await updateDoc(userRef, { fcmTokens: arrayRemove(token) });
        return true;
    } catch (error) {
        logger.error('Error removing FCM token', { uid, error });
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
        logger.error('Error retrieving user by phone number', { phoneNumber, error });
        throw error;
    }
}
