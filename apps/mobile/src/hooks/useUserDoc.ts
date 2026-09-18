import { useEffect, useState } from 'react';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

export type SocialProfiles = Partial<Record<'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'x', { handle?: string }>>;

export type UserDoc = {
  phoneNumbers?: string[];
  callNumber?: string;
  phoneNumberVerified?: boolean;
  email?: string | null;
  firstname?: string;
  lastname?: string;
  pseudo?: string;
  image?: string;
  roles?: string[];
  birthDate?: string;
  country?: { code?: string; name?: string };
  metadata?: { phoneVerification?: { lockUntil?: number | null } };
  socialProfiles?: SocialProfiles;
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
