import { getAuth } from '@react-native-firebase/auth';
import { doc, getFirestore, updateDoc } from '@react-native-firebase/firestore';

// Same keys and labels as PWA ParameterNotifications. Update only the changed leaf.
export const notificationSettings = [
  { key: 'isNew', title: 'Nouveautes', description: 'Recevez des mises a jour sur les nouvelles fonctionnalites et services.' },
  { key: 'isAccountActivity', title: 'Activites du compte', description: "Soyez informe des modifications liees a votre compte, telles que les changements d'email ou de mot de passe." },
  { key: 'isNewAnnouncement', title: 'Annonces', description: 'Recevez des notifications sur les nouvelles annonces disponibles dans votre region ou vos criteres de recherche.' },
  { key: 'isFavoris', title: 'Favoris', description: "Soyez averti lorsqu'une annonce ajoutee a vos favoris est mise a jour ou supprimee." },
  { key: 'isPersonalizedSuggestions', title: 'Suggestions personnalisees', description: 'Obtenez des recommandations personnalisees basees sur vos recherches recentes.' },
  { key: 'isSystemUpdated', title: 'Mises a jour systeme', description: 'Soyez informe des interruptions de service ou des mises a jour importantes.' },
] as const;
export type NotificationSettingKey = typeof notificationSettings[number]['key'];
export async function updateNotificationSetting(key: NotificationSettingKey, enabled: boolean) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Reconnectez-vous pour modifier vos paramètres.');
  if (!notificationSettings.some(item => item.key === key)) throw new Error('Paramètre inconnu.');
  await updateDoc(doc(getFirestore(), 'users', uid), { [`notificationParameter.${key}`]: enabled });
}
