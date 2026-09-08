import { getAuth } from '@react-native-firebase/auth';
import { navigationRef } from '../navigation/navigationRef';

// Pour une ACTION ponctuelle sur un écran par ailleurs public (toggle favoris, publier une
// demande de recherche) — contrairement à useRequireAuth (écran entier protégé), pas besoin
// d'un hook React ici : appelé depuis un event handler, pas pendant le rendu. Retourne true si
// l'action peut continuer, false si elle a été bloquée (et la redirection vers SignIn lancée).
export function requireAuthOrRedirect(): boolean {
  if (getAuth().currentUser) return true;
  if (navigationRef.isReady()) navigationRef.navigate('SignIn');
  return false;
}
