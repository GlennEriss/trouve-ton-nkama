'use server'

import { signOut as nextAuthSignOut } from '@/next-auth/auth'
import { createLogger } from '@/lib/logger';

const logger = createLogger('actions.signout');

const getAuth = () => import("@/firebase/auth");

// Fonction pour gérer la déconnexion
export const signout = async () => {
    // 1. Importer l'authentification Firebase
    const { auth, signOut: firebaseSignOut } = await getAuth();
    try {
        // 2. Déconnecter Firebase
        await firebaseSignOut(auth);

        // 3. Déconnecter next-auth
        await nextAuthSignOut({ redirect: false });
        return true
    } catch (error) {
        logger.error('Erreur lors de la déconnexion', { error });
        return false
    }
};
