import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

type EdgeAuthToken = JWT & {
  user?: unknown;
  oauthProvider?: "google" | "facebook" | null;
  oauthAccessTokenExpiresAt?: number;
  oauthTokenRefreshError?: string | null;
  oauthRefreshToken?: string;
};

const authEdgeConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      const authToken = token as EdgeAuthToken;

      if (authToken.user) {
        session.user = authToken.user as typeof session.user;
      }

      const expiresAt =
        typeof authToken.oauthAccessTokenExpiresAt === "number"
          ? authToken.oauthAccessTokenExpiresAt
          : null;

      let tokenStatus: "none" | "valid" | "expired" | "refresh_failed" = "none";
      if (authToken.oauthProvider) {
        if (authToken.oauthTokenRefreshError) {
          tokenStatus = "refresh_failed";
        } else if (expiresAt && Date.now() >= expiresAt) {
          tokenStatus = "expired";
        } else {
          tokenStatus = "valid";
        }
      }

      (session as typeof session & { auth?: Record<string, unknown> }).auth = {
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

export default authEdgeConfig;
