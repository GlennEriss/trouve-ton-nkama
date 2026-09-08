import { useEffect } from 'react';
import { useAuthState } from './useAuthState';
import { navigationRef } from '../navigation/navigationRef';

// Miroir mobile du middleware web (src/middleware.ts, PROTECTED_ROUTE_PREFIXES) : redirige
// automatiquement vers l'écran de connexion pour les écrans équivalents à des routes protégées
// (/favoris, /profil, /list-notifications...) — sans ça, ces onglets afficheraient juste un
// contenu vide indéfiniment pour un visiteur non connecté. `navigationRef` (pas useNavigation)
// pour pouvoir pousser 'SignIn' au niveau racine peu importe la profondeur d'imbrication de
// l'écran appelant dans MainTabs. `isChecking` reste vrai tant que la redirection est en
// attente, pour éviter un flash de contenu vide juste avant la bascule vers l'écran de connexion.
export function useRequireAuth() {
  const { user, initializing } = useAuthState();

  useEffect(() => {
    if (!initializing && !user && navigationRef.isReady()) {
      navigationRef.navigate('SignIn');
    }
  }, [initializing, user]);

  return { user, isChecking: initializing || !user };
}
