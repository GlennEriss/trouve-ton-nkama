import { useEffect, useState } from 'react';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

export type UserDoc = {
  phoneNumbers?: string[];
  phoneNumberVerified?: boolean;
  email?: string | null;
  firstname?: string;
  lastname?: string;
};

// Miroir léger de useFavoriteIds.ts (même document users/{uid}, même écoute onSnapshot) —
// utilisé partout où l'écran a besoin de connaître l'état de vérification du compte.
export function useUserDoc(): { userDoc: UserDoc | null; isLoading: boolean } {
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(getFirestore(), 'users', uid),
      (snapshot) => {
        setUserDoc((snapshot.data() as UserDoc | undefined) ?? null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  return { userDoc, isLoading };
}
