import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Permet de naviguer depuis en dehors d'un composant : listener FCM déclenché sur un tap de
// notification système alors qu'aucun écran n'est monté (voir usePushNotificationRouting), ou
// redirection automatique vers l'écran de connexion depuis un écran protégé (voir
// useRequireAuth) — typé sur RootStackParamList (pas juste MainTabParamList) car ce second cas
// doit pouvoir pousser 'SignIn' par-dessus, peu importe où on se trouve dans l'arbre.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
