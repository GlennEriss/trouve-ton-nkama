/* import { auth, GoogleAuthProvider } from "@/firebase/auth";
import { getUserDetailsByID } from "@/services/patientService";
import { createUserDetails, findUserByEmail, findUserDetailsByUser, getUserWithDetails } from "@/services/userService";
import { signInWithCredential } from "firebase/auth"; */
import { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";

//const getAuth = () => import('@/firebase/auth')
const authConfig = {
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    providers: [
        /* GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET
        }),
        Credentials({
            authorize: async (credentials) => {
                const { signInWithEmailAndPassword, auth } = await getAuth();
                const { uid } = credentials;
                if (uid) {
                    const user = await getUserDetailsByID({ userID: uid as string })
                    if (!user) return null
                    return {
                        ...user,
                        emailVerified: new Date()
                    }
                }
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
                    const user = await getUserWithDetails(userCredential.user.uid, userCredential.user)
                    return {
                        ...user.userDetails,
                        emailVerified: userCredential.user.metadata.creationTime
                    }
                } catch (error) {
                    console.error("Erreur d'authentification", error);
                    return null
                }
            }
        }) */
    ],
    callbacks: {
        /* async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                const credential = GoogleAuthProvider.credential(account.id_token);
                try {
                    const firebaseUser = await signInWithCredential(auth, credential);

                    const uid = firebaseUser.user.uid;
                    const userData = {
                        uid,
                        firstName: profile?.given_name,
                        lastName: profile?.family_name,
                        email: user.email,
                        avatarPATH: '',
                        avatarURL: profile?.picture,
                        patientsID: [],
                        phoneNumber: '',
                        professionalType: '',
                        role: "PRO",
                        username: profile?.given_name + ' ' + profile?.family_name,
                        description: '',
                        gender: 'Unknow',
                        birthdate: ''
                    };
                    const userExists = await findUserDetailsByUser(uid);
                    if (!userExists) {
                        await createUserDetails(userData);
                    }
                    user = {
                        ...user,
                        ...userExists
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
            if (token) {
                if (token?.email) {
                    const userDetails = await findUserByEmail(token.email)
                    token = {
                        ...token,
                        ...userDetails
                    }
                }
            }
            if (user) {
                token = {
                    ...token,
                    ...user
                }
            }
            if (trigger === "update") {
                token = {
                    ...token,
                    ...session
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.user = {
                id: token.id,
                firstName: token.firstName,
                lastName: token.lastName,
                lastVisit: token.lastVisit,
                phoneNumber: token.phoneNumber,
                role: token.role,
                status: token.status,
                uid: token.uid,
                username: token.username,
                avatarPATH: token.avatarPATH,
                avatarURL: token.avatarURL,
                patientsID: token.patientsID,
                professionalType: token.professionalType,
                birthDate: token.birthDate,
                gender: token.gender,
                description: token.description,
                email: token.email as string,
                age: token.age,
                emailVerified: token.emailVerified,
            };
            return session;
        } */
    },
} satisfies NextAuthConfig

export default authConfig 