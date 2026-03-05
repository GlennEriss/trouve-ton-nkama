import { createUser, updateUser } from "@/db/user.db";
import { auth, GoogleAuthProvider } from "@/firebase/auth";
import { FacebookAuthProvider, linkWithCredential, signInWithCredential } from "firebase/auth";
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { NotificationParameter } from "@/models/notification";
import { userRepository } from "@/features/auth/repositories/user.repository";
import {
    handleGoogleSignIn,
    validateCredentialsUserForOAuth,
} from "@/features/auth/services/oauth-google.service";

type ProviderType = 'GOOGLE' | 'FACEBOOK' | 'CREDENTIALS';

const getAuth = () => import('@/firebase/auth')

// Fonction pour créer les paramètres de notification par défaut
const createDefaultNotificationParameter = (): NotificationParameter => ({
    isNew: true,
    isAccountActivity: true,
    isNewAnnouncement: true,
    isFavoris: true,
    isPersonalizedSuggestions: true,
    isSystemUpdated: true
});

// Fonction pour gérer la connexion Facebook d'un nouvel utilisateur
const handleNewFacebookUser = async (user: any, account: any, profile: any, credential: any) => {
    const firebaseUser = await signInWithCredential(auth, credential);
    const uid = firebaseUser.user.uid;
    
    const userData = {
        uid,
        firstname: profile?.name ?? '',
        lastname: '',
        email: user?.email ?? '',
        image: profile?.picture?.data?.url ?? '',
        phoneNumbers: firebaseUser.user.phoneNumber ? [firebaseUser.user.phoneNumber] : [],
        phoneNumberVerified: false,
        roles: ["User"],
        searchableName: profile?.name ?? '',
        providers: ['FACEBOOK' as ProviderType],
        metadata: { accessToken: account.access_token },
        favoris: [],
        notificationParameter: createDefaultNotificationParameter()
    };
    
    await createUser(userData);
};

// Fonction pour gérer la connexion Facebook d'un utilisateur existant
const handleExistingFacebookUser = async (userExists: any, account: any, credential: any) => {
    const providers = userExists?.providers ?? [];
    
    if (!providers.includes('FACEBOOK')) {
        const googleCredential = GoogleAuthProvider.credential(userExists.metadata.idToken);
        const googleUser = await signInWithCredential(auth, googleCredential);
        await linkWithCredential(googleUser.user, credential);
        providers.push('FACEBOOK');
    }
    
    await updateUser(userExists.uid, {
        ...userExists,
        metadata: {
            ...userExists.metadata,
            accessToken: account.access_token
        },
        providers
    });
};

// Fonction pour gérer la connexion Facebook
const handleFacebookSignIn = async (user: any, account: any, profile: any, userExists: any) => {
    if (!account.access_token) {
        return false;
    }
    
    const credential = FacebookAuthProvider.credential(account.access_token);
    
    try {
        if (!userExists) {
            await handleNewFacebookUser(user, account, profile, credential);
        } else {
            await handleExistingFacebookUser(userExists, account, credential);
        }
        return true;
    } catch (error: any) {
        console.error("Erreur lors de la connexion avec Firebase:", error);
        return false;
    }
};

const authConfig = {
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET
        }),
        Credentials({
            authorize: async (credentials) => {
                const { signInWithEmailAndPassword, auth } = await getAuth();
                try {
                    const userCredential = await signInWithEmailAndPassword(
                        auth,
                        credentials.login as string,
                        credentials.password as string,
                    );
                    const isEmailVerify = userCredential.user.emailVerified
                    if (!isEmailVerify) {
                        throw new Error('Email is not verified')
                    }
                    if (!userCredential.user) {
                        throw new Error('User not found')
                    }
                    const user = await userRepository.findById(userCredential.user.uid)
                    if (!user) {
                        throw new Error('User not found')
                    }
                    return {
                        //...userCredential.user,
                        ...user,
                        emailVerified: userCredential.user.emailVerified,
                    } as any
                } catch (error: any) {
                    console.error("Erreur d'authentification", error);
                    
                    // Transmettre les erreurs Firebase spécifiques
                    if (error.code) {
                        throw new Error(error.code);
                    }
                    
                    // Pour les erreurs personnalisées (comme 'Email is not verified')
                    if (error.message) {
                        throw new Error(error.message);
                    }
                    
                    return null
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile, credentials }) {
            const userExists = user?.email
                ? await userRepository.findByEmail(user.email)
                : null;
            
            // Validation pour les utilisateurs avec credentials uniquement
            if (userExists) {
                const credentialsValidation = validateCredentialsUserForOAuth(userExists, credentials);
                if (credentialsValidation !== null) {
                    return credentialsValidation;
                }
            }
            
            // Gestion de la connexion Google
            if (account?.provider === "google") {
                const result = await handleGoogleSignIn(user, account, profile, userExists);
                // Si le résultat est une URL, c'est une redirection vers la page de complétion
                if (typeof result === 'string') {
                    return result;
                }
                return result;
            }
            
            // Gestion de la connexion Facebook
            if (account?.provider === "facebook") {
                return await handleFacebookSignIn(user, account, profile, userExists);
            }
            
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                const userDetails = user.email
                    ? await userRepository.findByEmail(user.email)
                    : null;
                if (userDetails) {
                    user = userDetails as any
                    
                    // Vérifier si l'utilisateur a besoin de compléter son profil
                    const hasCompleteInfo = user?.firstname && 
                                           user?.lastname && 
                                           user?.phoneNumbers?.[0] && 
                                           user?.birthDate;
                    
                    // Mettre à jour le flag needsProfileCompletion
                    if (user.metadata) {
                        user.metadata.needsProfileCompletion = !hasCompleteInfo;
                    }
                }
                token = {
                    ...token,
                    user
                }
            }

            if (trigger === "update") {
                token = {
                    ...token,
                    user: session.user
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.user = token.user
            return session;
        }
    },
} satisfies NextAuthConfig

export default authConfig 
