import { createUser, findUserByEmail, getUserByUID, updateUser } from "@/db/user.db";
import { auth, GoogleAuthProvider } from "@/firebase/auth";
import { ProviderType } from "@/models/authentication";
import { FacebookAuthProvider, linkWithCredential, signInWithCredential } from "firebase/auth";
import { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
//import { createNotification } from "@/db/notification.db";
import { routes } from "@/constantes/routes";
import { NotificationParameter } from "@/models/notification";

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

// Fonction pour valider les credentials
const validateCredentialsUser = (userExists: any, credentials: any) => {
    const hasOnlyCredentials = userExists?.providers?.includes('CREDENTIALS') &&
        !userExists?.providers?.includes('FACEBOOK') &&
        !userExists?.providers?.includes('GOOGLE');
    
    if (hasOnlyCredentials) {
        return credentials ? true : routes.public.signin + "?error=wrong_provider";
    }
    return null;
};

// Fonction pour gérer la connexion Google d'un nouvel utilisateur
const handleNewGoogleUser = async (user: any, account: any, profile: any, credential: any) => {
    const firebaseUser = await signInWithCredential(auth, credential);
    const uid = firebaseUser.user.uid;
    
    const userData = {
        uid,
        firstname: profile?.given_name ?? '',
        lastname: profile?.family_name ?? '',
        email: user?.email ?? '',
        image: profile?.picture ?? '',
        phoneNumbers: firebaseUser.user.phoneNumber ? [firebaseUser.user.phoneNumber] : [],
        role: ["Announcer"],
        searchableName: firebaseUser.user?.displayName ?? '',
        providers: ['GOOGLE' as ProviderType],
        metadata: { idToken: account.id_token },
        notificationParameter: createDefaultNotificationParameter()
    };
    
    await createUser(userData);
};

// Fonction pour gérer la connexion Google d'un utilisateur existant
const handleExistingGoogleUser = async (userExists: any, account: any, credential: any) => {
    const providers = userExists?.providers ?? [];
    
    if (!providers.includes('GOOGLE')) {
        const facebookCredential = FacebookAuthProvider.credential(userExists.metadata.accessToken);
        const facebookUser = await signInWithCredential(auth, facebookCredential);
        await linkWithCredential(facebookUser.user, credential);
        providers.push('GOOGLE');
    }
    
    await updateUser(userExists.uid, {
        ...userExists,
        metadata: {
            ...userExists.metadata,
            idToken: account.id_token
        },
        providers
    });
};

// Fonction pour gérer la connexion Google
const handleGoogleSignIn = async (user: any, account: any, profile: any, userExists: any) => {
    const credential = GoogleAuthProvider.credential(account.id_token);
    
    try {
        if (!userExists) {
            await handleNewGoogleUser(user, account, profile, credential);
        } else {
            await handleExistingGoogleUser(userExists, account, credential);
        }
        return true;
    } catch (error) {
        console.error("Erreur lors de la connexion avec Firebase:", error);
        return false;
    }
};

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
        role: ["Announcer"],
        searchableName: profile?.name ?? '',
        providers: ['FACEBOOK' as ProviderType],
        metadata: { accessToken: account.access_token },
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
                    const user = await getUserByUID(userCredential.user.uid)
                    if (!user) {
                        throw new Error('User not found')
                    }
                    return {
                        //...userCredential.user,
                        ...user,
                        emailVerified: userCredential.user.emailVerified,
                    }
                } catch (error) {
                    console.error("Erreur d'authentification", error);
                    return null
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile, credentials }) {
            const userExists = await findUserByEmail(user?.email ?? '');
            
            // Validation pour les utilisateurs avec credentials uniquement
            if (userExists) {
                const credentialsValidation = validateCredentialsUser(userExists, credentials);
                if (credentialsValidation !== null) {
                    return credentialsValidation;
                }
            }
            
            // Gestion de la connexion Google
            if (account?.provider === "google") {
                return await handleGoogleSignIn(user, account, profile, userExists);
            }
            
            // Gestion de la connexion Facebook
            if (account?.provider === "facebook") {
                return await handleFacebookSignIn(user, account, profile, userExists);
            }
            
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                const userDetails = await findUserByEmail(user.email!)
                if (userDetails) {
                    user = userDetails
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