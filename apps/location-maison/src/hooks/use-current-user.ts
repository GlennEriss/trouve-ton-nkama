import { auth, signInWithCustomToken } from "@/firebase/auth";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface UseCurrentUserReturn {
  user: any
  setUser: (user: any) => void
  isLoading: boolean
  isFirebaseConnected: boolean
  error: string | null
}

export const useCurrentUser = (): UseCurrentUserReturn => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(session?.user || undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour connecter à Firebase
  const connectToFirebase = useCallback(async (uid: string) => {
    //console.log('🚀 Connexion Firebase pour UID:', uid);
    
    setIsLoading(true);
    setError(null);

    try {
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
        throw new Error(errorData.details || `Erreur ${response.status}: ${response.statusText}`);
      }

      const { token } = await response.json();

      // 2. Se connecter à Firebase avec le custom token
      await signInWithCustomToken(auth, token);
      setIsFirebaseConnected(true);
      //console.log('✅ Connexion Firebase réussie');

    } catch (err: any) {
      const errorMessage = err.message || 'Erreur de connexion Firebase';
      //console.error('❌ Erreur Firebase Auth:', errorMessage);
      setError(errorMessage);
      setIsFirebaseConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effet principal pour gérer l'authentification
  useEffect(() => {
    /* console.log('🔍 État session:', { 
      status, 
      hasUser: !!session?.user, 
      hasFirebaseUser: !!auth.currentUser 
    }); */

    if (status === "authenticated" && session?.user) {
      setUser(session.user);
      
      const sessionUser = session.user as any;
      const uid = sessionUser.uid;
      
      // Connecter à Firebase si pas encore connecté et si on a un UID
      if (!auth.currentUser && uid) {
        //console.log('🚀 Initiation de la connexion Firebase...');
        connectToFirebase(uid);
      } else if (auth.currentUser) {
        //console.log('✅ Firebase déjà connecté');
        setIsFirebaseConnected(true);
      } else {
        console.warn('⚠️ Pas d\'UID disponible dans la session');
      }
    }

    if (status === "unauthenticated") {
      //console.log('🔓 Déconnexion détectée');
      setUser(undefined);
      setIsFirebaseConnected(false);
      setError(null);
    }
  }, [session, status, connectToFirebase]);

  // Vérifier périodiquement la connexion Firebase
  useEffect(() => {
    const checkFirebaseConnection = () => {
      const isConnected = !!auth.currentUser;
      if (isConnected !== isFirebaseConnected) {
        setIsFirebaseConnected(isConnected);
      }
    };

    const interval = setInterval(checkFirebaseConnection, 5000); // Vérifier toutes les 5 secondes
    
    return () => clearInterval(interval);
  }, [isFirebaseConnected]);

  //console.log('user', auth.currentUser)
  return { 
    user, 
    setUser, 
    isLoading,
    isFirebaseConnected,
    error
  };
};