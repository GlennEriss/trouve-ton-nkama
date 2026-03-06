import { auth, signInWithCustomToken } from "@/firebase/auth";
import { createLogger } from "@/lib/logger";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface UseCurrentUserReturn {
  user: any
  setUser: (user: any) => void
  isLoading: boolean
  isFirebaseConnected: boolean
  error: string | null
  auth: {
    provider: "google" | "facebook" | null
    accessTokenExpiresAt: number | null
    tokenStatus: "none" | "valid" | "expired" | "refresh_failed"
    tokenRefreshError: string | null
    hasRefreshToken: boolean
  } | null
  refreshSession: () => Promise<void>
}

const logger = createLogger("auth.use-current-user");

export const useCurrentUser = (): UseCurrentUserReturn => {
  const { data: session, status, update } = useSession();
  const [user, setUser] = useState(session?.user ?? undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour connecter à Firebase
  const connectToFirebase = useCallback(async (uid: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Vérifier si on est déjà connecté
      if (auth.currentUser) {
        setIsFirebaseConnected(true);
        return;
      }

      // 1. Générer un custom token
      const response = await fetch('/api/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uid })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details ?? `Erreur ${response.status}: ${response.statusText}`);
      }

      const { token } = await response.json();

      // 2. Se connecter à Firebase avec le custom token
      await signInWithCustomToken(auth, token);
      setIsFirebaseConnected(true);

    } catch (err: any) {
      logger.warn("Firebase custom-token sign-in failed", { err });
      const errorMessage = err.message ?? 'Erreur de connexion Firebase';
      setError(errorMessage);
      setIsFirebaseConnected(false);
      
      // Ne pas bloquer l'application si Firebase échoue
      // L'utilisateur peut continuer avec NextAuth
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effet principal pour gérer l'authentification
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser(session.user);
      
      const sessionUser = session.user as any;
      const uid = sessionUser.uid;
      
      // Connecter à Firebase si pas encore connecté et si on a un UID
      if (!auth.currentUser && uid) {
        connectToFirebase(uid);
      } else if (auth.currentUser) {
        setIsFirebaseConnected(true);
      } else {
        logger.warn("No UID found in authenticated session");
      }
    }

    if (status === "unauthenticated") {
      setUser(undefined);
      setIsFirebaseConnected(false);
      setError(null);
      
      // Déconnecter de Firebase si l'utilisateur n'est plus connecté
      if (auth.currentUser) {
        auth.signOut().catch(err => {
          logger.warn("Firebase signOut failed during unauthenticated transition", {
            err,
          });
        });
      }
    }
  }, [session, status, connectToFirebase]);

  // Effet pour synchroniser l'état local avec la session
  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
    }
  }, [session?.user]);

  // Vérifier périodiquement la connexion Firebase
  useEffect(() => {
    // Ne vérifier que si l'utilisateur est connecté
    if (status !== "authenticated") {
      return;
    }

    const checkFirebaseConnection = () => {
      const isConnected = !!auth.currentUser;
      if (isConnected !== isFirebaseConnected) {
        setIsFirebaseConnected(isConnected);
      }
    };

    const interval = setInterval(checkFirebaseConnection, 5000); // Vérifier toutes les 5 secondes
    
    return () => clearInterval(interval);
  }, [isFirebaseConnected, status]);

  const refreshSession = useCallback(async () => {
    try {
      await update();
      logger.info("Session refresh requested from useCurrentUser");
    } catch (err) {
      logger.warn("Session refresh failed from useCurrentUser", { err });
    }
  }, [update]);

  const authState = (session as any)?.auth
    ? {
        provider: (session as any).auth.provider ?? null,
        accessTokenExpiresAt:
          typeof (session as any).auth.accessTokenExpiresAt === "number"
            ? (session as any).auth.accessTokenExpiresAt
            : null,
        tokenStatus:
          ((session as any).auth.tokenStatus as
            | "none"
            | "valid"
            | "expired"
            | "refresh_failed") ?? "none",
        tokenRefreshError:
          typeof (session as any).auth.tokenRefreshError === "string"
            ? (session as any).auth.tokenRefreshError
            : null,
        hasRefreshToken: Boolean((session as any).auth.hasRefreshToken),
      }
    : null;

  return { 
    user, 
    setUser, 
    isLoading,
    isFirebaseConnected,
    error,
    auth: authState,
    refreshSession,
  };
};
