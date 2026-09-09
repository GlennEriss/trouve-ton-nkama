import { useEffect, useState } from 'react';
import { getFirestore, doc, onSnapshot, updateDoc, arrayRemove, arrayUnion } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

/** Miroir de ButtonFavoris.tsx (web) : `favoris` est un simple tableau d'ids de propriétés
 * sur le document `users/{uid}`, pas de collection dédiée. Écoute en direct (onSnapshot) —
 * pas juste une lecture ponctuelle — pour rester synchronisé si l'utilisateur modifie ses
 * favoris depuis le site web pendant que l'app est ouverte. */
export function useFavoriteIds(): { favoriteIds: string[]; isLoading: boolean } {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setFavoriteIds([]);
      setIsLoading(false);
      return;
    }

    const userRef = doc(getFirestore(), 'users', uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data() as { favoris?: string[] } | undefined;
        setFavoriteIds(Array.isArray(data?.favoris) ? data!.favoris : []);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  return { favoriteIds, isLoading };
}

export async function removeFavorite(propertyId: string): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(getFirestore(), 'users', uid), { favoris: arrayRemove(propertyId) });
}

export async function addFavorite(propertyId: string): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(getFirestore(), 'users', uid), { favoris: arrayUnion(propertyId) });
}
