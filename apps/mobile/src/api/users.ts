import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';

export type PublicUserSummary = {
  pseudo?: string;
  firstname?: string;
  lastname?: string;
  image?: string;
};

export async function getPublicUserSummary(uid: string): Promise<PublicUserSummary | null> {
  const snapshot = await getDoc(doc(getFirestore(), 'users', uid));
  return snapshot.exists() ? (snapshot.data() as PublicUserSummary) : null;
}
