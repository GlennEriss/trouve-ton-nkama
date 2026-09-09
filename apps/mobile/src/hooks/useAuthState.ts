import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, type User } from '@react-native-firebase/auth';

type AuthState = {
  user: User | null;
  /** false tant que Firebase n'a pas déterminé une première fois s'il y a une session
   * persistée ou non — distinct de `user === null`, qui peut aussi bien vouloir dire
   * "vraiment déconnecté" que "pas encore vérifié". Toujours attendre `initializing === false`
   * avant de brancher un listener Firestore dessus : même classe de bug que celle trouvée
   * cette session côté web (NotificationProvider s'abonnait avant que la session Firebase
   * soit réellement établie → permission-denied qui ne se réessayait jamais). Ici il n'y a
   * pas de pont NextAuth à attendre en plus — juste cette détermination initiale native. */
  initializing: boolean;
};

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  return { user, initializing };
}
