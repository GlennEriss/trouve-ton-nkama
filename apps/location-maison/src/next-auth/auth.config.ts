import { createUser, findUserByEmail, findUserDetailsByUserID, getUserByUID } from "@/db/user.db";
import { auth, GoogleAuthProvider } from "@/firebase/auth";
import { signInWithCredential } from "firebase/auth";
import { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";

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
        async signIn({ user, account, profile }) {
            /* console.log('user', user)
            console.log('account', account)
            console.log('profile', profile) */
            if (account?.provider === "google") {
                const credential = GoogleAuthProvider.credential(account.id_token);
                try {
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
                    };
                    const userExists = await findUserDetailsByUserID(uid);
                    if (!userExists) {
                        await createUser(userData);
                    }
                    return true;
                } catch (error) {
                    console.error("Erreur lors de la connexion avec Firebase:", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            if (!user && token?.email) {
                const userDetails = await findUserByEmail(token.email)
                if (userDetails) {
                    user = userDetails
                }
            }
            if (user) {
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