import { createUser, findUserByEmail, findUserDetailsByUserID, getUserByUID, updateUser } from "@/db/user.db";
import { auth, GoogleAuthProvider } from "@/firebase/auth";
import { ProviderType } from "@/models/authentication";
import { FacebookAuthProvider, fetchSignInMethodsForEmail, linkWithCredential, signInWithCredential, signInWithPopup } from "firebase/auth";
import { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { createNotification } from "@/db/notification.db";
import { routes } from "@/constantes/routes";
import { NotificationParameter } from "@/models/notification";
import { redirect } from "next/navigation";

const getAuth = () => import('@/firebase/auth')
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
            /* console.log('user', user)
            console.log('account', account)
            console.log('profile', profile) */
            const userExists = await findUserByEmail(user?.email ?? '');
            if (userExists) {
                if (
                    userExists?.providers?.includes('CREDENTIALS') &&
                    !userExists?.providers?.includes('FACEBOOK') &&
                    !userExists?.providers?.includes('GOOGLE')
                ) {
                    if (credentials) {
                        return true;
                    } else {
                        return routes.public.signin + "?error=wrong_provider"
                    }
                }
            }
            if (account?.provider === "google") {
                const credential = GoogleAuthProvider.credential(account.id_token);
                try {
                    if (!userExists) {
                        const firebaseUser = await signInWithCredential(auth, credential);
                        const uid = firebaseUser.user.uid;
                        const notificationParameter: NotificationParameter = {
                            isNew: true,
                            isAccountActivity: true,
                            isNewAnnouncement: true,
                            isFavoris: true,
                            isPersonalizedSuggestions: true,
                            isSystemUpdated: true
                        }
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
                            metadata: {
                                idToken: account.id_token
                            },
                            notificationParameter
                        };
                        await createUser(userData);
                        await createNotification({
                            type: 'SECURITY',
                            title: 'Sécurisez votre compte avec Facebook',
                            message: "Pour mieux protéger votre compte et éviter toute tentative d'accès non autorisé, connectez-le à Facebook dès maintenant.",
                            isRead: false,
                            createdFor: uid,
                            actionUrl: routes.protected.login_and_security,
                        });
                    } else {
                        const providers = userExists?.providers || []
                        if (!providers.includes('GOOGLE')) {
                            const facebookCredential = FacebookAuthProvider.credential(userExists.metadata.accessToken)
                            const facebookUser = await signInWithCredential(auth, facebookCredential)
                            await linkWithCredential(facebookUser.user, credential)
                            providers.push('GOOGLE')
                            await createNotification({
                                type: 'SECURITY',
                                title: 'Sécurité avec Google',
                                message: "Votre compte a été sécurisé avec Google",
                                isRead: false,
                                createdFor: user.uid,
                                actionUrl: routes.protected.login_and_security,
                            });
                        }
                        await updateUser(userExists.uid, {
                            ...userExists,
                            metadata: {
                                ...userExists.metadata,
                                idToken: account.id_token
                            },
                            providers
                        })
                    }
                    return true;
                } catch (error) {
                    console.error("Erreur lors de la connexion avec Firebase:", error);
                    return false;
                }
            }
            if (account?.provider === "facebook") {
                if (!account.access_token) {
                    return false
                }
                const credential = FacebookAuthProvider.credential(account.access_token)
                try {
                    if (!userExists) {
                        const firebaseUser = await signInWithCredential(auth, credential)
                        const uid = firebaseUser.user.uid
                        const notificationParameter: NotificationParameter = {
                            isNew: true,
                            isAccountActivity: true,
                            isNewAnnouncement: true,
                            isFavoris: true,
                            isPersonalizedSuggestions: true,
                            isSystemUpdated: true
                        }
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
                            metadata: {
                                accessToken: account.access_token
                            },
                            notificationParameter
                        }
                        await createUser(userData);
                        await createNotification({
                            type: 'SECURITY',
                            title: 'Sécurisez votre compte avec Google',
                            message: "Pour mieux protéger votre compte et éviter toute tentative d'accès non autorisé, connectez-le à Google dès maintenant.",
                            isRead: false,
                            createdFor: uid,
                            actionUrl: routes.protected.login_and_security,
                        });
                    } else {
                        const providers = userExists?.providers || []
                        if (!providers.includes('FACEBOOK')) {
                            const googleCredential = GoogleAuthProvider.credential(userExists.metadata.idToken)
                            const googleUser = await signInWithCredential(auth, googleCredential);
                            await linkWithCredential(googleUser.user, credential);
                            providers.push('FACEBOOK')
                            await createNotification({
                                type: 'SECURITY',
                                title: 'Sécurité avec Facebook',
                                message: "Votre compte a été sécurisé avec Facebook",
                                isRead: false,
                                createdFor: user.uid,
                                actionUrl: routes.protected.login_and_security,
                            });
                        }
                        await updateUser(userExists.uid, {
                            ...userExists,
                            metadata: {
                                ...userExists.metadata,
                                accessToken: account.access_token
                            },
                            providers
                        })
                    }
                } catch (error: any) {
                    console.error("Erreur lors de la connexion avec Firebase:", error);
                    return false;
                }
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