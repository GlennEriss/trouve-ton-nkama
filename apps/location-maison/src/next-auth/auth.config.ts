import { routes } from "@/constantes/routes";
import { createUser, updateUser } from "@/db/user.db";
import {
  handleGoogleSignIn,
  validateCredentialsUserForOAuth,
} from "@/features/auth/services/oauth-google.service";
import { userRepository } from "@/features/auth/repositories/user.repository";
import {
  resolveSessionUser,
  toSessionUserIdentity,
} from "@/features/auth/services/resolve-session-user";
import { authenticateWithPhoneIdToken } from "@/features/auth/services/phone-auth.service";
import { auth, GoogleAuthProvider } from "@/firebase/auth";
import { createLogger } from "@/lib/logger";
import type { Role } from "@/models/authentication";
import { NotificationParameter } from "@/models/notification";
import { FacebookAuthProvider, linkWithCredential, signInWithCredential } from "firebase/auth";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

type ProviderType = "GOOGLE" | "FACEBOOK" | "CREDENTIALS" | "PHONE";

type AuthToken = JWT & {
  user?: unknown;
  oauthProvider?: "google" | "facebook" | null;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthAccessTokenExpiresAt?: number;
  oauthTokenRefreshError?: string | null;
};

const logger = createLogger("auth.next-auth");
const getAuth = () => import("@/firebase/auth");
const GOOGLE_TOKEN_REFRESH_BUFFER_MS = 60_000;

// Fonction pour creer les parametres de notification par defaut
const createDefaultNotificationParameter = (): NotificationParameter => ({
  isNew: true,
  isAccountActivity: true,
  isNewAnnouncement: true,
  isFavoris: true,
  isPersonalizedSuggestions: true,
  isSystemUpdated: true,
});

// Fonction pour gerer la connexion Facebook d'un nouvel utilisateur
const handleNewFacebookUser = async (
  user: any,
  account: any,
  profile: any,
  credential: any
) => {
  const firebaseUser = await signInWithCredential(auth, credential);
  const uid = firebaseUser.user.uid;

  const userData = {
    uid,
    firstname: profile?.name ?? "",
    lastname: "",
    email: user?.email ?? "",
    image: profile?.picture?.data?.url ?? "",
    phoneNumbers: firebaseUser.user.phoneNumber ? [firebaseUser.user.phoneNumber] : [],
    phoneNumberVerified: false,
    roles: ["User"] as Role[],
    searchableName: profile?.name ?? "",
    providers: ["FACEBOOK" as ProviderType],
    metadata: { accessToken: account.access_token },
    favoris: [],
    notificationParameter: createDefaultNotificationParameter(),
  };

  await createUser(userData);
};

// Fonction pour gerer la connexion Facebook d'un utilisateur existant
const handleExistingFacebookUser = async (userExists: any, account: any, credential: any) => {
  const providers = userExists?.providers ?? [];

  if (!providers.includes("FACEBOOK")) {
    const googleIdToken = userExists?.metadata?.idToken;
    if (typeof googleIdToken === "string" && googleIdToken.length > 0) {
      const googleCredential = GoogleAuthProvider.credential(googleIdToken);
      if (googleCredential) {
        const googleUser = await signInWithCredential(auth, googleCredential);
        await linkWithCredential(googleUser.user, credential);
      }
    }
    providers.push("FACEBOOK");
  }

  await updateUser(userExists.uid, {
    ...userExists,
    metadata: {
      ...userExists.metadata,
      accessToken: account.access_token,
    },
    providers,
  });
};

// Fonction pour gerer la connexion Facebook
const handleFacebookSignIn = async (
  user: any,
  account: any,
  profile: any,
  userExists: any
): Promise<boolean | string> => {
  if (!account.access_token) {
    logger.warn("Facebook sign-in failed: missing access token");
    return `${routes.public.signin}?error=facebook_missing_access_token`;
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
    logger.error("Facebook sign-in flow failed", {
      email: user?.email,
      userExists: Boolean(userExists),
      code: error?.code,
      error,
    });

    if (error?.code === "auth/operation-not-allowed") {
      return `${routes.public.signin}?error=facebook_provider_disabled`;
    }

    return `${routes.public.signin}?error=facebook_signin_failed`;
  }
};

function getTokenRefreshErrorLabel(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  if (!("error" in error)) {
    return undefined;
  }
  const value = (error as { error?: unknown }).error;
  return typeof value === "string" ? value : undefined;
}

async function refreshGoogleAccessToken(token: AuthToken): Promise<AuthToken> {
  const refreshToken = token.oauthRefreshToken;

  if (!refreshToken) {
    logger.warn("Google token refresh skipped: missing refresh token");
    return {
      ...token,
      oauthTokenRefreshError: "MISSING_REFRESH_TOKEN",
    };
  }

  try {
    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const refreshResponse = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !refreshResponse.access_token || !refreshResponse.expires_in) {
      logger.error("Google token refresh failed", {
        status: response.status,
        statusText: response.statusText,
        refreshResponse,
      });
      return {
        ...token,
        oauthTokenRefreshError:
          getTokenRefreshErrorLabel(refreshResponse) ?? "REFRESH_FAILED",
      };
    }

    logger.info("Google token refreshed");
    return {
      ...token,
      oauthAccessToken: refreshResponse.access_token,
      oauthAccessTokenExpiresAt: Date.now() + refreshResponse.expires_in * 1000,
      oauthRefreshToken: refreshResponse.refresh_token ?? refreshToken,
      oauthTokenRefreshError: null,
    };
  } catch (error) {
    logger.error("Google token refresh failed with exception", { error });
    return {
      ...token,
      oauthTokenRefreshError: "REFRESH_FAILED",
    };
  }
}

const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    Credentials({
      authorize: async (credentials) => {
        const { signInWithEmailAndPassword, auth } = await getAuth();
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.login as string,
            credentials.password as string
          );

          if (!userCredential.user.emailVerified) {
            throw new Error("Email is not verified");
          }

          const user = await userRepository.findById(userCredential.user.uid);
          if (!user) {
            throw new Error("User not found");
          }

          return {
            ...user,
            emailVerified: userCredential.user.emailVerified,
          } as any;
        } catch (error: any) {
          logger.warn("Credentials sign-in failed", {
            login: credentials.login,
            code: error?.code,
            error,
          });

          if (error.code) {
            throw new Error(error.code);
          }
          if (error.message) {
            throw new Error(error.message);
          }
          return null;
        }
      },
    }),
    // Passwordless phone (OTP) provider. The client performs Firebase Phone Auth
    // and passes the resulting Firebase ID token; we verify it server-side and
    // resolve/provision the announcer account.
    Credentials({
      id: "phone",
      name: "Phone",
      credentials: {
        idToken: { label: "Firebase phone ID token", type: "text" },
      },
      authorize: async (credentials) => {
        const idToken = typeof credentials?.idToken === "string" ? credentials.idToken : "";
        if (!idToken) {
          throw new Error("phone_missing_id_token");
        }
        try {
          const user = await authenticateWithPhoneIdToken(idToken);
          return { ...user, emailVerified: user.emailVerified ?? false } as any;
        } catch (error: any) {
          logger.warn("Phone sign-in failed", { code: error?.code, error });
          throw new Error(error?.code ?? "phone_signin_failed");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, credentials }) {
      try {
        // Resolve by uid → phone → email so email-less providers (phone OTP)
        // hydrate too, while OAuth/Credentials keep resolving as before.
        const userExists = await resolveSessionUser(toSessionUserIdentity(user));

        if (userExists) {
          const credentialsValidation = validateCredentialsUserForOAuth(
            userExists,
            credentials
          );
          if (credentialsValidation !== null) {
            return credentialsValidation;
          }
        }

        if (account?.provider === "google") {
          return await handleGoogleSignIn(
            user,
            account,
            (profile ?? {}) as any,
            userExists
          );
        }

        if (account?.provider === "facebook") {
          return await handleFacebookSignIn(user, account, profile, userExists);
        }

        return true;
      } catch (error) {
        logger.error("signIn callback failed", {
          email: user?.email,
          provider: account?.provider,
          error,
        });
        return `${routes.public.signin}?error=signin_callback_failed`;
      }
    },
    async jwt({ token, user, trigger, session, account }) {
      const currentToken: AuthToken = {
        ...(token as AuthToken),
      };

      if (account?.provider === "google") {
        currentToken.oauthProvider = "google";
        currentToken.oauthAccessToken = account.access_token ?? undefined;
        currentToken.oauthRefreshToken =
          account.refresh_token ?? currentToken.oauthRefreshToken;
        currentToken.oauthAccessTokenExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : currentToken.oauthAccessTokenExpiresAt;
        currentToken.oauthTokenRefreshError = null;
      }

      if (account?.provider === "facebook") {
        currentToken.oauthProvider = "facebook";
        currentToken.oauthAccessToken = account.access_token ?? undefined;
        currentToken.oauthAccessTokenExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : undefined;
        currentToken.oauthRefreshToken = undefined;
        currentToken.oauthTokenRefreshError = null;
      }

      if (account?.provider === "credentials" || account?.provider === "phone") {
        currentToken.oauthProvider = null;
        currentToken.oauthAccessToken = undefined;
        currentToken.oauthRefreshToken = undefined;
        currentToken.oauthAccessTokenExpiresAt = undefined;
        currentToken.oauthTokenRefreshError = null;
      }

      if (user) {
        try {
          const userDetails = await resolveSessionUser(toSessionUserIdentity(user));

          if (userDetails) {
            user = userDetails as any;
            const hasCompleteInfo =
              user?.firstname &&
              user?.lastname &&
              user?.phoneNumbers?.[0] &&
              user?.birthDate;

            if (user.metadata) {
              user.metadata.needsProfileCompletion = !hasCompleteInfo;
            }
          }
        } catch (error) {
          logger.error("Failed to hydrate user in jwt callback", {
            email: user.email,
            error,
          });
        }

        currentToken.user = user as any;
      }

      if (trigger === "update") {
        currentToken.user = session.user as any;
      }

      if (
        currentToken.oauthProvider === "google" &&
        typeof currentToken.oauthAccessTokenExpiresAt === "number"
      ) {
        const shouldRefresh =
          Date.now() >=
          currentToken.oauthAccessTokenExpiresAt - GOOGLE_TOKEN_REFRESH_BUFFER_MS;

        if (shouldRefresh) {
          return await refreshGoogleAccessToken(currentToken);
        }
      }

      return currentToken;
    },
    async session({ session, token }) {
      const authToken = token as AuthToken;
      session.user = token.user as any;

      let tokenStatus: "none" | "valid" | "expired" | "refresh_failed" = "none";
      const expiresAt =
        typeof authToken.oauthAccessTokenExpiresAt === "number"
          ? authToken.oauthAccessTokenExpiresAt
          : null;

      if (authToken.oauthProvider) {
        if (authToken.oauthTokenRefreshError) {
          tokenStatus = "refresh_failed";
        } else if (expiresAt && Date.now() >= expiresAt) {
          tokenStatus = "expired";
        } else {
          tokenStatus = "valid";
        }
      }

      session.auth = {
        provider: authToken.oauthProvider ?? null,
        accessTokenExpiresAt: expiresAt,
        tokenStatus,
        tokenRefreshError: authToken.oauthTokenRefreshError ?? null,
        hasRefreshToken: Boolean(authToken.oauthRefreshToken),
      };

      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
