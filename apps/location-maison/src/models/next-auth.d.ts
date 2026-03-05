import { User as UserDetails } from "@/models/authentication";

type OAuthTokenStatus = "none" | "valid" | "expired" | "refresh_failed";

export interface SessionAuthState {
  provider: "google" | "facebook" | null;
  accessTokenExpiresAt: number | null;
  tokenStatus: OAuthTokenStatus;
  tokenRefreshError: string | null;
  hasRefreshToken: boolean;
}

declare module "@auth/core/types" {
  interface User extends UserDetails {
    firebaseToken?: string;
  }

  interface Session {
    user: User;
    auth?: SessionAuthState;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    user?: UserDetails;
    oauthProvider?: "google" | "facebook" | null;
    oauthAccessToken?: string;
    oauthRefreshToken?: string;
    oauthAccessTokenExpiresAt?: number;
    oauthTokenRefreshError?: string | null;
  }
}
